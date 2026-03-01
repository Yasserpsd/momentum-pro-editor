(function($) {
    'use strict';

    /**
     * Momentum Pro Editor v2.0 - Editor Panel Script
     * This runs in the Elementor EDITOR (not the preview)
     * Handles: saving modifications from preview, reset button
     */

    var MomentumPanel = {

        init: function() {
            this.listenToPreview();
            console.log('Momentum Panel: Ready');
        },

        listenToPreview: function() {
            var self = this;

            // Listen for messages from preview iframe
            window.addEventListener('message', function(e) {
                if (!e.data || e.data.type !== 'momentum-save') return;

                var widgetId = e.data.widgetId;
                var mods = e.data.modifications;

                if (!widgetId || !mods) return;

                // Find widget and save
                try {
                    var widget = self.findWidget(elementor.elements, widgetId);
                    if (widget) {
                        widget.setSetting('saved_modifications', JSON.stringify(mods));
                    }
                } catch(err) {
                    console.log('Momentum save error:', err);
                }
            });
        },

        findWidget: function(elements, id) {
            var r = null;
            elements.forEach(function(el) {
                if (r) return;
                if (el.get('id') === id) { r = el; return; }
                var ch = el.get('elements');
                if (ch && ch.length) r = this.findWidget(ch, id);
            }.bind(this));
            return r;
        }
    };

    // Reset function
    window.momentumResetModifications = function() {
        if (!confirm('متأكد إنك عايز تحذف كل التعديلات وترجع للكود الأصلي؟')) return;
        try {
            var view = elementor.getPanelView().getCurrentPageView().getOption('editedElementView');
            if (view) {
                view.model.setSetting('saved_modifications', '{}');
                view.render();
                elementor.notifications.showToast({ message: '✅ تم إعادة تعيين التعديلات', duration: 3000 });
            }
        } catch(e) {}
    };

    // Start
    $(window).on('elementor:init', function() {
        setTimeout(function() { MomentumPanel.init(); }, 1000);
    });

    $(document).ready(function() {
        setTimeout(function() {
            if (typeof elementor !== 'undefined') MomentumPanel.init();
        }, 2000);
    });

})(jQuery);
