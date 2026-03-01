(function($) {
    'use strict';

    var MomentumPanel = {

        initialized: false,

        init: function() {
            if (this.initialized) return;
            this.initialized = true;
            this.listenToPreview();
            console.log('[Momentum] Panel: Ready');
        },

        listenToPreview: function() {
            var self = this;

            window.addEventListener('message', function(e) {
                if (!e.data || e.data.type !== 'momentum-save') return;

                var widgetId = e.data.widgetId;
                var mods     = e.data.modifications;

                if (!widgetId || !mods) {
                    console.warn('[Momentum] Save message missing data');
                    return;
                }

                console.log('[Momentum] Received save for widget:', widgetId, mods);

                try {
                    var widget = self.findWidget(widgetId);
                    if (widget) {
                        var modsJson = JSON.stringify(mods);
                        widget.setSetting('saved_modifications', modsJson);
                        console.log('[Momentum] ✅ setSetting done, length:', modsJson.length);
                    } else {
                        console.error('[Momentum] ❌ Widget NOT found:', widgetId);
                        // Fallback: try $e.run command
                        self.fallbackSave(widgetId, mods);
                    }
                } catch(err) {
                    console.error('[Momentum] Save error:', err);
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

        /**
         * Fallback: لو findWidget مش لاقي الويدجت، 
         * نجرب نحفظ من خلال الـ panel view
         */
        fallbackSave: function(widgetId, mods) {
            try {
                var panel = elementor.getPanelView();
                if (!panel) return;
                var page = panel.getCurrentPageView();
                if (!page) return;
                var editedView = page.getOption('editedElementView');
                if (editedView && editedView.model) {
                    var currentId = editedView.model.get('id');
                    if (currentId === widgetId) {
                        editedView.model.setSetting('saved_modifications', JSON.stringify(mods));
                        console.log('[Momentum] ✅ Fallback save worked!');
                    }
                }
            } catch(e) {
                console.error('[Momentum] Fallback save failed:', e);
            }
        }
    };

    // Reset button
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

                // Force server re-render
                if (typeof editedView.model.renderRemoteServer === 'function') {
                    editedView.model.renderRemoteServer();
                } else if (typeof editedView.render === 'function') {
                    editedView.render();
                }

                // Tell preview to reset
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
