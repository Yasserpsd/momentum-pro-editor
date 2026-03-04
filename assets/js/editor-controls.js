(function($) {
    'use strict';

    var MomentumPanel = {

        initialized: false,

        init: function() {
            if (this.initialized) return;
            this.initialized = true;
            this.listenToSyncRequest();
            console.log('[Momentum] Panel: Ready v4.1');
        },

        listenToSyncRequest: function() {
            var self = this;
            window.addEventListener('message', function(e) {
                if (!e.data) return;
                if (e.data.type === 'momentum-request-sync') {
                    self.syncToCode(e.data.widgetId, e.data.html);
                }
            });
        },

        syncToCode: function(widgetId, liveHtml) {
            var self = this;
            var widget = self.findWidget(widgetId);

            if (!widget) {
                widget = self.findWidgetFallback(widgetId);
            }

            if (!widget) {
                console.warn('[Momentum] Cannot sync - widget not found');
                self.showToast('❌ لم يتم العثور على الويدجت');
                return;
            }

            // Show loading state
            var $btn = $('#momentum-sync-btn');
            var originalText = $btn.text();
            $btn.text('⏳ جاري المزامنة...').prop('disabled', true);

            $.ajax({
                url: momentumAjax.url,
                type: 'POST',
                data: {
                    action: 'momentum_sync_code',
                    nonce: momentumAjax.nonce,
                    html: liveHtml
                },
                success: function(response) {
                    $btn.text(originalText).prop('disabled', false);

                    if (response.success && response.data && response.data.html) {
                        var newHtml = response.data.html;
                        var settings = widget.get('settings');

                        if (settings && typeof settings.set === 'function') {
                            settings.set('html_code', newHtml, { silent: false });
                        } else {
                            widget.setSetting('html_code', newHtml);
                        }

                        // Notify preview
                        try {
                            var previewFrame = elementor.$preview && elementor.$preview[0];
                            if (previewFrame && previewFrame.contentWindow) {
                                previewFrame.contentWindow.postMessage({
                                    type: 'momentum-code-synced',
                                    widgetId: widgetId
                                }, '*');
                            }
                        } catch(e2) {}

                        self.showToast('✅ تم مزامنة الكود بنجاح!');
                        console.log('[Momentum] Code synced successfully!');
                    } else {
                        console.error('[Momentum] Sync failed:', response);
                        self.showToast('❌ فشل المزامنة');
                    }
                },
                error: function(xhr, status, error) {
                    $btn.text(originalText).prop('disabled', false);
                    console.error('[Momentum] Sync AJAX error:', error);
                    self.showToast('❌ خطأ في الاتصال');
                }
            });
        },

        showToast: function(msg) {
            if (typeof elementor !== 'undefined' && elementor.notifications) {
                elementor.notifications.showToast({
                    message: msg,
                    duration: 3000
                });
            }
        },

        findWidget: function(id) {
            var result = null;

            function search(collection) {
                if (result) return;
                if (!collection) return;

                var models = collection.models || (Array.isArray(collection) ? collection : null);
                if (!models) return;

                for (var i = 0; i < models.length; i++) {
                    if (result) return;
                    var model = models[i];
                    if (!model) continue;

                    var modelId = (typeof model.get === 'function') ? model.get('id') : model.id;

                    if (modelId === id) {
                        result = model;
                        return;
                    }

                    var children = (typeof model.get === 'function') ? model.get('elements') : null;
                    if (children && (children.length || (children.models && children.models.length))) {
                        search(children);
                    }
                }
            }

            if (typeof elementor !== 'undefined' && elementor.elements) {
                search(elementor.elements);
            }

            return result;
        },

        findWidgetFallback: function(widgetId) {
            try {
                var panel = elementor.getPanelView();
                if (!panel) return null;
                var page = panel.getCurrentPageView();
                if (!page) return null;
                var editedView = page.getOption('editedElementView');
                if (editedView && editedView.model) {
                    var currentId = editedView.model.get('id');
                    if (currentId === widgetId) {
                        return editedView.model;
                    }
                }
            } catch(e) {}
            return null;
        }
    };

    // ============================================
    // SYNC BUTTON
    // ============================================
    window.momentumSyncToCode = function() {
        try {
            var previewFrame = elementor.$preview && elementor.$preview[0];
            if (!previewFrame || !previewFrame.contentWindow) return;

            var panel = elementor.getPanelView();
            if (!panel) return;
            var currentPage = panel.getCurrentPageView();
            if (!currentPage) return;
            var editedView = currentPage.getOption('editedElementView');
            if (!editedView || !editedView.model) return;

            var widgetId = editedView.model.get('id');

            previewFrame.contentWindow.postMessage({
                type: 'momentum-get-html',
                widgetId: widgetId
            }, '*');
        } catch(e) {
            console.error('[Momentum] Sync button error:', e);
        }
    };

    // Init
    $(window).on('elementor:init', function() {
        MomentumPanel.init();
    });

    $(document).ready(function() {
        setTimeout(function() {
            if (typeof elementor !== 'undefined') MomentumPanel.init();
        }, 2000);
    });

})(jQuery);
