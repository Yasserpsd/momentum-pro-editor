(function($) {
    'use strict';

    /**
     * Momentum Preview Helper
     * Runs inside the Elementor preview iframe
     */
    var MomentumPreview = {

        init: function() {
            // Only run in editor mode
            if (!$('body').hasClass('elementor-editor-active')) return;

            this.setup();
            this.watch();
            console.log('Momentum Preview: Active');
        },

        setup: function() {
            var self = this;

            $('.momentum-html-output').each(function() {
                var $output = $(this);
                if ($output.data('m-preview-ready')) return;
                $output.data('m-preview-ready', true);

                // Add visual indicator
                $output.on('mouseenter', function() {
                    if (!$(this).find('.m-edit-badge').length) {
                        var $badge = $('<div class="m-edit-badge"></div>').css({
                            position: 'absolute',
                            top: '8px',
                            right: '8px',
                            background: 'linear-gradient(135deg, #6C63FF, #4CAF50)',
                            color: '#fff',
                            padding: '4px 14px',
                            borderRadius: '20px',
                            fontSize: '11px',
                            fontFamily: 'sans-serif',
                            zIndex: 9999,
                            pointerEvents: 'none',
                            boxShadow: '0 2px 10px rgba(108,99,255,0.3)'
                        }).text('✏️ اضغط على أي عنصر للتعديل');

                        $(this).css('position', 'relative').append($badge);
                    }
                }).on('mouseleave', function() {
                    $(this).find('.m-edit-badge').remove();
                });
            });
        },

        watch: function() {
            var self = this;

            // Watch for new widgets
            var observer = new MutationObserver(function() {
                self.setup();
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true
            });

            // Periodic check
            setInterval(function() { self.setup(); }, 3000);
        }
    };

    $(document).ready(function() {
        setTimeout(function() {
            MomentumPreview.init();
        }, 1000);
    });

    window.MomentumPreview = MomentumPreview;

})(jQuery);
