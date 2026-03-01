(function($) {
    'use strict';

    /**
     * Momentum Pro Editor - Preview Parser
     * Handles live preview updates when controls change
     */
    var MomentumParser = {

        init: function() {
            this.bindEvents();
            console.log('Momentum Parser: Ready');
        },

        bindEvents: function() {
            // Listen for Elementor widget changes in preview
            $(document).on('momentum_update_preview', function(e, data) {
                MomentumParser.updatePreview(data);
            });
        },

        /**
         * Parse HTML string and return structured data
         */
        parseHTML: function(htmlString) {
            var result = {
                texts: [],
                images: [],
                links: [],
                containers: []
            };

            if (!htmlString || htmlString.trim() === '') {
                return result;
            }

            var parser = new DOMParser();
            var doc = parser.parseFromString(htmlString, 'text/html');

            // Parse text elements
            var textTags = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'span', 'a', 'li', 'td', 'th', 'label', 'button', 'strong', 'em', 'b', 'i', 'small', 'blockquote'];
            var textIndex = 0;

            textTags.forEach(function(tag) {
                var elements = doc.querySelectorAll(tag);
                elements.forEach(function(el, idx) {
                    textIndex++;
                    if (textIndex > 20) return;

                    var textContent = MomentumParser.getDirectText(el);
                    var styles = MomentumParser.extractStyles(el);

                    result.texts.push({
                        index: textIndex,
                        tag: tag,
                        tagIndex: idx,
                        content: textContent,
                        color: styles.color || '',
                        fontSize: styles.fontSize || '',
                        fontSizeUnit: styles.fontSizeUnit || 'px',
                        fontWeight: styles.fontWeight || '',
                        textAlign: styles.textAlign || '',
                        className: el.className || '',
                        id: el.id || ''
                    });
                });
            });

            // Parse images
            var images = doc.querySelectorAll('img');
            var imgIndex = 0;

            images.forEach(function(img, idx) {
                imgIndex++;
                if (imgIndex > 10) return;

                var styles = MomentumParser.extractStyles(img);

                result.images.push({
                    index: imgIndex,
                    src: img.getAttribute('src') || '',
                    alt: img.getAttribute('alt') || '',
                    width: img.getAttribute('width') || styles.width || '',
                    height: img.getAttribute('height') || styles.height || '',
                    borderRadius: styles.borderRadius || '',
                    className: img.className || '',
                    id: img.id || ''
                });
            });

            // Parse links
            var links = doc.querySelectorAll('a');
            links.forEach(function(link, idx) {
                result.links.push({
                    index: idx,
                    href: link.getAttribute('href') || '',
                    target: link.getAttribute('target') || '',
                    text: link.textContent.trim()
                });
            });

            // Parse containers (divs with classes or styles)
            var containers = doc.querySelectorAll('div[class], div[style], section, article, header, footer, main, aside, nav');
            containers.forEach(function(container, idx) {
                var styles = MomentumParser.extractStyles(container);
                result.containers.push({
                    index: idx,
                    tag: container.tagName.toLowerCase(),
                    className: container.className || '',
                    id: container.id || '',
                    padding: styles.padding || '',
                    margin: styles.margin || '',
                    backgroundColor: styles.backgroundColor || ''
                });
            });

            return result;
        },

        /**
         * Get direct text content of an element (excluding child elements)
         */
        getDirectText: function(element) {
            var text = '';
            var childNodes = element.childNodes;

            for (var i = 0; i < childNodes.length; i++) {
                if (childNodes[i].nodeType === Node.TEXT_NODE) {
                    text += childNodes[i].textContent;
                }
            }

            text = text.trim();

            // If no direct text, get full text content
            if (text === '') {
                text = element.textContent.trim();
            }

            return text;
        },

        /**
         * Extract inline styles from an element
         */
        extractStyles: function(element) {
            var styles = {};
            var styleAttr = element.getAttribute('style') || '';

            if (styleAttr === '') return styles;

            // Color
            var colorMatch = styleAttr.match(/(?:^|;)\s*color\s*:\s*([^;]+)/i);
            if (colorMatch) {
                styles.color = colorMatch[1].trim();
            }

            // Font size
            var fontSizeMatch = styleAttr.match(/font-size\s*:\s*(\d+\.?\d*)(px|em|rem|%|vw|vh)/i);
            if (fontSizeMatch) {
                styles.fontSize = parseFloat(fontSizeMatch[1]);
                styles.fontSizeUnit = fontSizeMatch[2];
            }

            // Font weight
            var fontWeightMatch = styleAttr.match(/font-weight\s*:\s*([^;]+)/i);
            if (fontWeightMatch) {
                styles.fontWeight = fontWeightMatch[1].trim();
            }

            // Text align
            var textAlignMatch = styleAttr.match(/text-align\s*:\s*([^;]+)/i);
            if (textAlignMatch) {
                styles.textAlign = textAlignMatch[1].trim();
            }

            // Background color
            var bgMatch = styleAttr.match(/background-color\s*:\s*([^;]+)/i);
            if (bgMatch) {
                styles.backgroundColor = bgMatch[1].trim();
            }

            // Padding
            var paddingMatch = styleAttr.match(/padding\s*:\s*([^;]+)/i);
            if (paddingMatch) {
                styles.padding = paddingMatch[1].trim();
            }

            // Margin
            var marginMatch = styleAttr.match(/margin\s*:\s*([^;]+)/i);
            if (marginMatch) {
                styles.margin = marginMatch[1].trim();
            }

            // Width
            var widthMatch = styleAttr.match(/(?:^|;)\s*width\s*:\s*(\d+\.?\d*)(px|%|em|rem|vw)/i);
            if (widthMatch) {
                styles.width = widthMatch[1] + widthMatch[2];
            }

            // Height
            var heightMatch = styleAttr.match(/(?:^|;)\s*height\s*:\s*(\d+\.?\d*)(px|%|em|rem|vh)/i);
            if (heightMatch) {
                styles.height = heightMatch[1] + heightMatch[2];
            }

            // Border radius
            var borderRadiusMatch = styleAttr.match(/border-radius\s*:\s*(\d+\.?\d*)(px|%)/i);
            if (borderRadiusMatch) {
                styles.borderRadius = borderRadiusMatch[1] + borderRadiusMatch[2];
            }

            return styles;
        },

        /**
         * Apply modifications to HTML and return modified version
         */
        applyModifications: function(htmlString, modifications) {
            if (!htmlString) return htmlString;

            var parser = new DOMParser();
            var doc = parser.parseFromString('<div id="momentum-root">' + htmlString + '</div>', 'text/html');
            var root = doc.getElementById('momentum-root');

            // Apply text modifications
            if (modifications.texts) {
                var textTags = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'span', 'a', 'li', 'td', 'th', 'label', 'button', 'strong', 'em', 'b', 'i', 'small', 'blockquote'];
                var textCounter = 0;

                textTags.forEach(function(tag) {
                    var elements = root.querySelectorAll(tag);
                    elements.forEach(function(el) {
                        textCounter++;
                        var mod = modifications.texts[textCounter];
                        if (!mod) return;

                        // Update text
                        if (mod.content !== undefined && mod.content !== '') {
                            var hasChildElements = false;
                            for (var c = 0; c < el.childNodes.length; c++) {
                                if (el.childNodes[c].nodeType === Node.ELEMENT_NODE) {
                                    hasChildElements = true;
                                    break;
                                }
                            }
                            if (!hasChildElements) {
                                el.textContent = mod.content;
                            }
                        }

                        // Update color
                        if (mod.color) {
                            el.style.color = mod.color;
                        }

                        // Update font size
                        if (mod.fontSize) {
                            el.style.fontSize = mod.fontSize + (mod.fontSizeUnit || 'px');
                        }
                    });
                });
            }

            // Apply image modifications
            if (modifications.images) {
                var images = root.querySelectorAll('img');
                var imgCounter = 0;

                images.forEach(function(img) {
                    imgCounter++;
                    var mod = modifications.images[imgCounter];
                    if (!mod) return;

                    if (mod.src) {
                        img.setAttribute('src', mod.src);
                    }
                    if (mod.width) {
                        img.style.width = mod.width;
                    }
                    if (mod.height) {
                        img.style.height = mod.height;
                    }
                    if (mod.borderRadius) {
                        img.style.borderRadius = mod.borderRadius;
                    }
                });
            }

            return root.innerHTML;
        },

        /**
         * Update preview in Elementor
         */
        updatePreview: function(data) {
            var $widget = $('.elementor-widget-momentum_html_pro');
            if ($widget.length === 0) return;

            var $output = $widget.find('.momentum-html-output');
            if ($output.length === 0) return;

            if (data.html) {
                $output.html(data.html);
            }
        }
    };

    // Initialize when document is ready
    $(document).ready(function() {
        MomentumParser.init();
    });

    // Expose globally for other scripts
    window.MomentumParser = MomentumParser;

})(jQuery);
