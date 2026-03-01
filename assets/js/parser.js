(function($) {
    'use strict';

    /**
     * Momentum Pro Editor v2.0 - Preview Helper
     * Runs inside the Elementor preview iframe
     */
    var MomentumPreview = {

        ready: false,

        init: function() {
            if (this.ready) return;
            if (!$('body').hasClass('elementor-editor-active')) return;
            this.ready = true;

            this.setup();
            this.watch();
            console.log('Momentum Preview v2.0: Active');
        },

        setup: function() {
            var self = this;

            $('.momentum-html-output').each(function() {
                var $w = $(this);
                if ($w.data('m-pv2')) return;
                $w.data('m-pv2', true);

                // Badge on hover
                $w.on('mouseenter', function() {
                    if ($(this).find('.m-badge').length) return;

                    var $badge = $('<div class="m-badge"></div>').css({
                        position: 'absolute',
                        top: '8px',
                        right: '8px',
                        background: 'linear-gradient(135deg, #6C63FF, #4CAF50)',
                        color: '#fff',
                        padding: '5px 14px',
                        borderRadius: '20px',
                        fontSize: '11px',
                        fontFamily: 'sans-serif',
                        zIndex: 9999,
                        pointerEvents: 'none',
                        boxShadow: '0 2px 12px rgba(108,99,255,0.4)',
                        letterSpacing: '0.3px'
                    }).html('✏️ <strong>Momentum</strong> — اضغط على أي عنصر للتعديل');

                    $(this).css('position', 'relative').append($badge);
                }).on('mouseleave', function() {
                    $(this).find('.m-badge').remove();
                });

                // Prevent links from navigating in editor
                $w.find('a').on('click', function(e) {
                    e.preventDefault();
                });
            });
        },

        watch: function() {
            var self = this;

            // MutationObserver
            var observer = new MutationObserver(function(mutations) {
                var found = false;
                mutations.forEach(function(m) {
                    if (m.addedNodes.length) {
                        $(m.addedNodes).each(function() {
                            if ($(this).find('.momentum-html-output').length || $(this).hasClass('momentum-html-output')) {
                                found = true;
                            }
                        });
                    }
                });
                if (found) {
                    setTimeout(function() { self.setup(); }, 500);
                }
            });

            observer.observe(document.body, { childList: true, subtree: true });

            // Periodic fallback
            setInterval(function() { self.setup(); }, 4000);
        }
    };

    $(document).ready(function() {
        setTimeout(function() { MomentumPreview.init(); }, 800);
    });

    window.MomentumPreview = MomentumPreview;

})(jQuery);
