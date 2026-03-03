(function($) {
    'use strict';

    var MomentumPanel = {

        initialized: false,
        saveTimer: null,

        init: function() {
            if (this.initialized) return;
            this.initialized = true;
            this.listenToPreview();
            this.listenToSyncRequest();
            console.log('[Momentum] Panel: Ready v3.0');
        },

        listenToPreview: function() {
            var self = this;

            window.addEventListener('message', function(e) {
                if (!e.data || e.data.type !== 'momentum-save') return;

                var widgetId = e.data.widgetId;
                var mods     = e.data.modifications;
                var autoSync = e.data.autoSync;

                if (!widgetId || !mods) {
                    console.warn('[Momentum] Save message missing data');
                    return;
                }

                if (self.saveTimer) clearTimeout(self.saveTimer);

                self.saveTimer = setTimeout(function() {
                    self.doSave(widgetId, mods);

                    // Auto sync to code if enabled
                    if (autoSync === 'yes') {
                        self.syncToCode(widgetId, mods);
                    }
                }, 400);
            });
        },

        listenToSyncRequest: function() {
            var self = this;
            window.addEventListener('message', function(e) {
                if (!e.data || e.data.type !== 'momentum-request-sync') return;
                var widgetId = e.data.widgetId;
                var mods = e.data.modifications;
                if (widgetId && mods) {
                    self.syncToCode(widgetId, mods);
                }
            });
        },

        doSave: function(widgetId, mods) {
            var self = this;

            try {
                var modsJson = JSON.stringify(mods);
                var widget = self.findWidget(widgetId);

                if (widget) {
                    var settings = widget.get('settings');
                    if (settings && typeof settings.set === 'function') {
                        settings.set('saved_modifications', modsJson, { silent: true });
                    } else {
                        widget.setSetting('saved_modifications', modsJson);
                    }
                    console.log('[Momentum] Saved, length:', modsJson.length);
                } else {
                    console.warn('[Momentum] Widget not found, trying fallback:', widgetId);
                    self.fallbackSave(widgetId, mods);
                }
            } catch(err) {
                console.error('[Momentum] Save error:', err);
            }
        },

        /**
         * Sync modifications back into the HTML code control
         */
        syncToCode: function(widgetId, mods) {
            var self = this;
            var widget = self.findWidget(widgetId);
            if (!widget) {
                widget = self.findWidgetFallback(widgetId);
            }
            if (!widget) {
                console.warn('[Momentum] Cannot sync - widget not found');
                return;
            }

            var settings = widget.get('settings');
            var originalHtml = '';
            if (settings && typeof settings.get === 'function') {
                originalHtml = settings.get('html_code');
            }

            if (!originalHtml) {
                console.warn('[Momentum] Cannot sync - no HTML code');
                return;
            }

            // Use AJAX to apply mods server-side and get back clean HTML
            $.ajax({
                url: momentumAjax.url,
                type: 'POST',
                data: {
                    action: 'momentum_sync_code',
                    nonce: momentumAjax.nonce,
                    html: originalHtml,
                    mods: JSON.stringify(mods)
                },
                success: function(response) {
                    if (response.success && response.data && response.data.html) {
                        var newHtml = response.data.html;

                        // Update the html_code setting
                        if (settings && typeof settings.set === 'function') {
                            settings.set('html_code', newHtml, { silent: false });
                        } else {
                            widget.setSetting('html_code', newHtml);
                        }

                        // Clear modifications since they're now in the code
                        if (settings && typeof settings.set === 'function') {
                            settings.set('saved_modifications', '{}', { silent: true });
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

                        // Show notification
                        if (typeof elementor !== 'undefined' && elementor.notifications) {
                            elementor.notifications.showToast({
                                message: '✅ الكود اتحدّث بالتعديلات بنجاح!',
                                duration: 3000
                            });
                        }

                        console.log('[Momentum] Code synced successfully!');
                    } else {
                        console.error('[Momentum] Sync failed:', response);
                        if (typeof elementor !== 'undefined' && elementor.notifications) {
                            elementor.notifications.showToast({
                                message: '❌ فشل مزامنة الكود',
                                duration: 3000
                            });
                        }
                    }
                },
                error: function(xhr, status, error) {
                    console.error('[Momentum] Sync AJAX error:', error);
                }
            });
        },

        findWidget: function(id) {
            var result = null;

            function search(collection) {
                if (result) return;
                if (!collection) return;

                var models;
                if (collection.models) {
                    models = collection.models;
                } else if (Array.isArray(collection)) {
                    models = collection;
                } else {
                    return;
                }

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
        },

        fallbackSave: function(widgetId, mods) {
            try {
                var widget = this.findWidgetFallback(widgetId);
                if (widget) {
                    var settings = widget.get('settings');
                    if (settings && typeof settings.set === 'function') {
                        settings.set('saved_modifications', JSON.stringify(mods), { silent: true });
                    } else {
                        widget.setSetting('saved_modifications', JSON.stringify(mods));
                    }
                    console.log('[Momentum] Fallback save worked!');
                }
            } catch(e) {
                console.error('[Momentum] Fallback save failed:', e);
            }
        }
    };

    // ============================================
    // SYNC BUTTON (called from panel)
    // ============================================
    window.momentumSyncToCode = function() {
        try {
            var panel = elementor.getPanelView();
            if (!panel) return;
            var currentPage = panel.getCurrentPageView();
            if (!currentPage) return;
            var editedView = currentPage.getOption('editedElementView');

            if (editedView && editedView.model) {
                var widgetId = editedView.model.get('id');
                var settings = editedView.model.get('settings');
                var modsStr = '';
                if (settings && typeof settings.get === 'function') {
                    modsStr = settings.get('saved_modifications') || '{}';
                }

                var mods;
                try { mods = JSON.parse(modsStr); } catch(e) { mods = {}; }

                if (!mods || (Object.keys(mods.texts || {}).length === 0 && Object.keys(mods.images || {}).length === 0 && Object.keys(mods.links || {}).length === 0)) {
                    elementor.notifications.showToast({
                        message: 'مفيش تعديلات للمزامنة',
                        duration: 2000
                    });
                    return;
                }

                MomentumPanel.syncToCode(widgetId, mods);
            }
        } catch(e) {
            console.error('[Momentum] Sync button error:', e);
        }
    };

    // ============================================
    // RESET BUTTON
    // ============================================
    window.momentumResetModifications = function() {
        if (!confirm('متأكد إنك عايز تحذف كل التعديلات وترجع للكود الأصلي؟')) return;

        try {
            var panel = elementor.getPanelView();
            if (!panel) return;
            var currentPage = panel.getCurrentPageView();
            if (!currentPage) return;
            var editedView = currentPage.getOption('editedElementView');

            if (editedView && editedView.model) {
                editedView.model.setSetting('saved_modifications', '{}');

                if (typeof editedView.model.renderRemoteServer === 'function') {
                    editedView.model.renderRemoteServer();
                } else if (typeof editedView.render === 'function') {
                    editedView.render();
                }

                try {
                    var previewFrame = elementor.$preview && elementor.$preview[0];
                    if (previewFrame && previewFrame.contentWindow) {
                        previewFrame.contentWindow.postMessage({
                            type: 'momentum-reset',
                            widgetId: editedView.model.get('id')
                        }, '*');
                    }
                } catch(e2) {}

                elementor.notifications.showToast({
                    message: '✅ تم إعادة تعيين التعديلات',
                    duration: 3000
                });
            }
        } catch(e) {
            console.error('[Momentum] Reset error:', e);
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
