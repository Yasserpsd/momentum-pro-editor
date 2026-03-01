(function($) {
    'use strict';

    // ============================================
    // Momentum Pro Editor v2.0
    // Full Inline Editing System
    // ============================================

    var Momentum = {

        modifications: {},
        history: {},
        historyIndex: {},
        maxHistory: 50,
        isReady: false,
        activeElement: null,
        resizing: false,

        // ============================================
        // INIT
        // ============================================
        init: function() {
            if (this.isReady) return;
            this.isReady = true;
            this.listen();
            console.log('Momentum Pro Editor v2.0: Ready');
        },

        listen: function() {
            var self = this;
            if (typeof elementor === 'undefined') return;

            elementor.on('preview:loaded', function() {
                setTimeout(function() { self.setup(); }, 1500);
            });

            elementor.channels.editor.on('section:activated', function() {
                setTimeout(function() { self.setup(); }, 800);
            });

            setInterval(function() { self.setup(); }, 4000);
        },

        // ============================================
        // IFRAME HELPERS
        // ============================================
        getDoc: function() {
            try {
                var iframe = document.getElementById('elementor-preview-iframe');
                if (iframe && iframe.contentDocument) return $(iframe.contentDocument);
            } catch(e) {}
            return null;
        },

        getBody: function() {
            var doc = this.getDoc();
            return doc ? doc.find('body') : null;
        },

        // ============================================
        // SETUP
        // ============================================
        setup: function() {
            var self = this;
            var $doc = this.getDoc();
            if (!$doc) return;

            $doc.find('.momentum-html-output').each(function() {
                var $output = $(this);
                if ($output.data('m-v2')) return;
                $output.data('m-v2', true);

                var wid = $output.data('widget-id');

                // Initialize history
                if (!self.history[wid]) {
                    self.history[wid] = [];
                    self.historyIndex[wid] = -1;
                }

                self.setupTexts($output, wid);
                self.setupImages($output, wid);
                self.setupLinks($output, wid);
                self.setupContainers($output, wid);
                self.setupKeyboard($output, wid);
            });
        },

        // ============================================
        // TEXT EDITING
        // ============================================
        setupTexts: function($output, wid) {
            var self = this;
            var tags = 'h1,h2,h3,h4,h5,h6,p,span,a,li,td,th,label,button,strong,em,b,i,small,blockquote';

            $output.find(tags).each(function() {
                var $el = $(this);
                if ($el.data('m-t')) return;
                $el.data('m-t', true);

                // Check direct text
                var hasText = false;
                for (var i = 0; i < this.childNodes.length; i++) {
                    if (this.childNodes[i].nodeType === 3 && this.childNodes[i].textContent.trim()) {
                        hasText = true;
                        break;
                    }
                }
                if (!hasText && $el.children().length > 0) return;

                $el.attr('contenteditable', 'true');
                $el.css({ 'cursor': 'text', 'outline': 'none' });

                if ($el.is('a')) {
                    $el.on('click.m', function(e) { e.preventDefault(); });
                }

                $el.on('mouseenter.m', function() {
                    if (!$(this).is(':focus')) {
                        $(this).css({ 'outline': '2px dashed rgba(108,99,255,0.4)', 'outline-offset': '2px' });
                    }
                }).on('mouseleave.m', function() {
                    if (!$(this).is(':focus')) {
                        $(this).css('outline', 'none');
                    }
                });

                $el.on('focus.m', function() {
                    self.activeElement = $(this);
                    $(this).css({ 'outline': '2px solid #6C63FF', 'outline-offset': '3px' });
                    self.showToolbar($(this), wid);
                });

                $el.on('blur.m', function() {
                    $(this).css('outline', 'none');
                    self.saveText($(this), wid);
                    setTimeout(function() {
                        if (!self.activeElement || !self.activeElement.is(':focus')) {
                            self.hideToolbar();
                        }
                    }, 200);
                });

                $el.on('input.m', function() {
                    self.saveText($(this), wid);
                });
            });
        },

        saveText: function($el, wid) {
            var key = this.getKey($el);
            this.ensureMods(wid);

            var text = '';
            for (var i = 0; i < $el[0].childNodes.length; i++) {
                if ($el[0].childNodes[i].nodeType === 3) text += $el[0].childNodes[i].textContent;
            }
            text = text.trim() || $el.text().trim();

            if (!this.modifications[wid].texts[key]) this.modifications[wid].texts[key] = {};
            this.modifications[wid].texts[key].text = text;

            this.pushHistory(wid);
            this.save(wid);
        },

        // ============================================
        // ENHANCED TOOLBAR
        // ============================================
        showToolbar: function($el, wid) {
            var self = this;
            this.hideToolbar();

            var $body = this.getBody();
            if (!$body) return;

            var offset = $el.offset();
            var scrollTop = $body.scrollTop() || 0;

            // Main toolbar container
            var $bar = $('<div id="m-toolbar"></div>').css({
                position: 'absolute',
                zIndex: 999999,
                top: (offset.top - 52) + 'px',
                left: Math.max(10, offset.left) + 'px',
                background: '#1a1a2e',
                borderRadius: '12px',
                padding: '5px 8px',
                display: 'flex',
                gap: '4px',
                alignItems: 'center',
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                border: '1px solid rgba(108,99,255,0.3)',
                flexWrap: 'wrap',
                maxWidth: '500px'
            });

            // --- BOLD ---
            var isBold = ($el.css('font-weight') === '700' || $el.css('font-weight') === 'bold');
            var $bold = this.mkBtn('B', 'عريض', isBold).css('font-weight', 'bold');
            $bold.on('mousedown', function(e) {
                e.preventDefault();
                var b = ($el.css('font-weight') === '700' || $el.css('font-weight') === 'bold');
                var v = b ? 'normal' : 'bold';
                $el.css('font-weight', v);
                $(this).css('background', b ? '#2a2a3e' : '#6C63FF');
                self.saveStyle($el, wid, 'fontWeight', v);
            });

            // --- ITALIC ---
            var isItalic = ($el.css('font-style') === 'italic');
            var $italic = this.mkBtn('I', 'مائل', isItalic).css('font-style', 'italic');
            $italic.on('mousedown', function(e) {
                e.preventDefault();
                var it = ($el.css('font-style') === 'italic');
                var v = it ? 'normal' : 'italic';
                $el.css('font-style', v);
                $(this).css('background', it ? '#2a2a3e' : '#6C63FF');
                self.saveStyle($el, wid, 'fontStyle', v);
            });

            // --- UNDERLINE ---
            var isUnderline = ($el.css('text-decoration').indexOf('underline') !== -1);
            var $underline = this.mkBtn('U', 'تحته خط', isUnderline).css('text-decoration', 'underline');
            $underline.on('mousedown', function(e) {
                e.preventDefault();
                var u = ($el.css('text-decoration').indexOf('underline') !== -1);
                var v = u ? 'none' : 'underline';
                $el.css('text-decoration', v);
                $(this).css('background', u ? '#2a2a3e' : '#6C63FF');
                self.saveStyle($el, wid, 'textDecoration', v);
            });

            // --- SEPARATOR ---
            var $sep = function() {
                return $('<div></div>').css({ width: '1px', height: '24px', background: '#333', margin: '0 2px' });
            };

            // --- ALIGN ---
            var currentAlign = $el.css('text-align') || 'right';

            var $alignRight = this.mkBtn('☰', 'يمين', currentAlign === 'right' || currentAlign === 'start');
            $alignRight.css('font-size', '11px');
            $alignRight.on('mousedown', function(e) {
                e.preventDefault();
                $el.css('text-align', 'right');
                self.updateAlignBtns($(this).parent(), 'right');
                self.saveStyle($el, wid, 'textAlign', 'right');
            });

            var $alignCenter = this.mkBtn('☰', 'وسط', currentAlign === 'center');
            $alignCenter.css('font-size', '11px');
            $alignCenter.on('mousedown', function(e) {
                e.preventDefault();
                $el.css('text-align', 'center');
                self.updateAlignBtns($(this).parent(), 'center');
                self.saveStyle($el, wid, 'textAlign', 'center');
            });

            var $alignLeft = this.mkBtn('☰', 'شمال', currentAlign === 'left' || currentAlign === 'end');
            $alignLeft.css('font-size', '11px');
            $alignLeft.on('mousedown', function(e) {
                e.preventDefault();
                $el.css('text-align', 'left');
                self.updateAlignBtns($(this).parent(), 'left');
                self.saveStyle($el, wid, 'textAlign', 'left');
            });

            $alignRight.attr('data-align', 'right');
            $alignCenter.attr('data-align', 'center');
            $alignLeft.attr('data-align', 'left');

            // --- FONT SIZE ---
            var size = parseInt($el.css('font-size')) || 16;
            var $sizeDown = this.mkBtn('−', 'تصغير');
            var $sizeLabel = $('<span></span>').css({ color: '#fff', fontSize: '11px', minWidth: '38px', textAlign: 'center', userSelect: 'none' }).text(size + 'px');
            var $sizeUp = this.mkBtn('+', 'تكبير');

            $sizeDown.on('mousedown', function(e) {
                e.preventDefault();
                size = Math.max(6, size - 1);
                $el.css('font-size', size + 'px');
                $sizeLabel.text(size + 'px');
                self.saveStyle($el, wid, 'fontSize', size + 'px');
            });

            $sizeUp.on('mousedown', function(e) {
                e.preventDefault();
                size = Math.min(200, size + 1);
                $el.css('font-size', size + 'px');
                $sizeLabel.text(size + 'px');
                self.saveStyle($el, wid, 'fontSize', size + 'px');
            });

            // --- LINE HEIGHT ---
            var lh = parseFloat($el.css('line-height')) / (parseInt($el.css('font-size')) || 16);
            lh = Math.round(lh * 10) / 10 || 1.5;
            var $lhDown = this.mkBtn('↕−', 'تقليل ارتفاع السطر');
            var $lhLabel = $('<span></span>').css({ color: '#aaa', fontSize: '10px', minWidth: '30px', textAlign: 'center', userSelect: 'none' }).text(lh.toFixed(1));
            var $lhUp = this.mkBtn('↕+', 'زيادة ارتفاع السطر');

            $lhDown.on('mousedown', function(e) {
                e.preventDefault();
                lh = Math.max(0.5, lh - 0.1);
                lh = Math.round(lh * 10) / 10;
                $el.css('line-height', lh);
                $lhLabel.text(lh.toFixed(1));
                self.saveStyle($el, wid, 'lineHeight', String(lh));
            });

            $lhUp.on('mousedown', function(e) {
                e.preventDefault();
                lh = Math.min(5, lh + 0.1);
                lh = Math.round(lh * 10) / 10;
                $el.css('line-height', lh);
                $lhLabel.text(lh.toFixed(1));
                self.saveStyle($el, wid, 'lineHeight', String(lh));
            });

            // --- COLOR ---
            var color = this.rgbHex($el.css('color')) || '#333333';
            var $color = $('<input type="color">').val(color).css({
                width: '28px', height: '28px', border: '2px solid #444', borderRadius: '6px',
                cursor: 'pointer', padding: '0', background: 'none'
            }).attr('title', 'لون النص');

            $color.on('input', function() {
                $el.css('color', $(this).val());
                self.saveStyle($el, wid, 'color', $(this).val());
            });

            // --- BG COLOR ---
            var bgColor = self.rgbHex($el.css('background-color'));
            if (bgColor === '#000000' && $el.css('background-color') === 'rgba(0, 0, 0, 0)') {
                bgColor = '#ffffff';
            }
            var $bgColor = $('<input type="color">').val(bgColor || '#ffffff').css({
                width: '28px', height: '28px', border: '2px solid #444', borderRadius: '6px',
                cursor: 'pointer', padding: '0', background: 'none'
            }).attr('title', 'لون الخلفية');

            $bgColor.on('input', function() {
                $el.css('background-color', $(this).val());
                self.saveStyle($el, wid, 'backgroundColor', $(this).val());
            });

            // --- UNDO / REDO ---
            var $undo = this.mkBtn('↩', 'تراجع (Ctrl+Z)');
            $undo.on('mousedown', function(e) {
                e.preventDefault();
                self.undo(wid);
            });

            var $redo = this.mkBtn('↪', 'إعادة (Ctrl+Y)');
            $redo.on('mousedown', function(e) {
                e.preventDefault();
                self.redo(wid);
            });

            // --- LINK EDIT (if element is <a>) ---
            var $linkBtn = null;
            if ($el.is('a') || $el.closest('a').length) {
                $linkBtn = this.mkBtn('🔗', 'تعديل الرابط');
                $linkBtn.on('mousedown', function(e) {
                    e.preventDefault();
                    var $a = $el.is('a') ? $el : $el.closest('a');
                    self.showLinkEditor($a, wid);
                });
            }

            // Build toolbar
            $bar.append(
                $bold, $italic, $underline,
                $sep(),
                $alignRight, $alignCenter, $alignLeft,
                $sep(),
                $sizeDown, $sizeLabel, $sizeUp,
                $sep(),
                $lhDown, $lhLabel, $lhUp,
                $sep(),
                $color, $bgColor,
                $sep(),
                $undo, $redo
            );

            if ($linkBtn) {
                $bar.append($sep(), $linkBtn);
            }

            $body.append($bar);

            // Adjust position if toolbar goes off screen
            setTimeout(function() {
                var barWidth = $bar.outerWidth();
                var bodyWidth = $body.width();
                var left = parseInt($bar.css('left'));
                if (left + barWidth > bodyWidth - 20) {
                    $bar.css('left', Math.max(10, bodyWidth - barWidth - 20) + 'px');
                }
                if (offset.top - 52 < 5) {
                    $bar.css('top', (offset.top + $el.outerHeight() + 8) + 'px');
                }
            }, 10);
        },

        updateAlignBtns: function($bar, active) {
            $bar.find('[data-align]').each(function() {
                $(this).css('background', $(this).data('align') === active ? '#6C63FF' : '#2a2a3e');
            });
        },

        mkBtn: function(text, title, active) {
            return $('<button></button>').text(text).attr('title', title).css({
                background: active ? '#6C63FF' : '#2a2a3e',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                width: '30px',
                height: '30px',
                cursor: 'pointer',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.15s',
                flexShrink: 0
            }).on('mouseenter', function() {
                if (!$(this).data('active')) $(this).css('background', '#3a3a4e');
            }).on('mouseleave', function() {
                if (!$(this).data('active')) $(this).css('background', active ? '#6C63FF' : '#2a2a3e');
            });
        },

        hideToolbar: function() {
            var $body = this.getBody();
            if ($body) {
                $body.find('#m-toolbar').remove();
                $body.find('#m-link-editor').remove();
            }
        },

        // ============================================
        // LINK EDITOR
        // ============================================
        setupLinks: function($output, wid) {
            var self = this;

            $output.find('a').each(function() {
                var $a = $(this);
                if ($a.data('m-link')) return;
                $a.data('m-link', true);

                $a.on('dblclick.m', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    self.showLinkEditor($(this), wid);
                });
            });
        },

        showLinkEditor: function($a, wid) {
            var self = this;
            var $body = this.getBody();
            if (!$body) return;

            $body.find('#m-link-editor').remove();

            var offset = $a.offset();
            var currentHref = $a.attr('href') || '';
            var currentTarget = $a.attr('target') || '';
            var currentText = $a.text().trim();

            var $editor = $('<div id="m-link-editor"></div>').css({
                position: 'absolute',
                zIndex: 999999,
                top: (offset.top + $a.outerHeight() + 8) + 'px',
                left: Math.max(10, offset.left) + 'px',
                background: '#1a1a2e',
                borderRadius: '12px',
                padding: '16px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                border: '1px solid rgba(108,99,255,0.3)',
                width: '320px',
                fontFamily: 'sans-serif'
            });

            var inputStyle = 'width:100%;padding:8px 12px;border:1px solid #333;border-radius:6px;background:#2a2a3e;color:#fff;font-size:13px;margin-top:4px;box-sizing:border-box;outline:none;';

            var $form = $('<div></div>');

            // URL
            $form.append(
                '<label style="color:#aaa;font-size:11px;display:block;margin-bottom:10px;">🔗 رابط URL' +
                '<input type="url" id="m-link-url" value="' + currentHref + '" placeholder="https://example.com" style="' + inputStyle + '">' +
                '</label>'
            );

            // Text
            $form.append(
                '<label style="color:#aaa;font-size:11px;display:block;margin-bottom:10px;">📝 نص الرابط' +
                '<input type="text" id="m-link-text" value="' + currentText + '" placeholder="اكتب النص هنا" style="' + inputStyle + '">' +
                '</label>'
            );

            // Target
            $form.append(
                '<label style="color:#aaa;font-size:11px;display:flex;align-items:center;gap:8px;margin-bottom:12px;">' +
                '<input type="checkbox" id="m-link-target" ' + (currentTarget === '_blank' ? 'checked' : '') + ' style="width:16px;height:16px;">' +
                'فتح في نافذة جديدة' +
                '</label>'
            );

            // Buttons
            var btnStyle = 'padding:8px 16px;border:none;border-radius:6px;cursor:pointer;font-size:13px;font-weight:600;';

            $form.append(
                '<div style="display:flex;gap:8px;justify-content:flex-end;">' +
                '<button id="m-link-cancel" style="' + btnStyle + 'background:#333;color:#fff;">إلغاء</button>' +
                '<button id="m-link-save" style="' + btnStyle + 'background:#6C63FF;color:#fff;">💾 حفظ</button>' +
                '<button id="m-link-remove" style="' + btnStyle + 'background:#e74c3c;color:#fff;">🗑️ حذف الرابط</button>' +
                '</div>'
            );

            $editor.append($form);
            $body.append($editor);

            // Events
            $editor.find('#m-link-save').on('click', function() {
                var newUrl = $editor.find('#m-link-url').val();
                var newText = $editor.find('#m-link-text').val();
                var newTarget = $editor.find('#m-link-target').is(':checked') ? '_blank' : '';

                $a.attr('href', newUrl);
                if (newText) $a.text(newText);
                if (newTarget) {
                    $a.attr('target', '_blank');
                    $a.attr('rel', 'noopener noreferrer');
                } else {
                    $a.removeAttr('target');
                    $a.removeAttr('rel');
                }

                self.saveLink($a, wid, newUrl, newTarget);
                $editor.remove();
            });

            $editor.find('#m-link-cancel').on('click', function() {
                $editor.remove();
            });

            $editor.find('#m-link-remove').on('click', function() {
                var text = $a.text();
                $a.replaceWith(text);
                $editor.remove();
                self.save(wid);
            });
        },

        saveLink: function($a, wid, url, target) {
            var $output = $a.closest('.momentum-html-output');
            var index = $output.find('a').index($a);
            var key = 'a:' + index;

            this.ensureMods(wid);
            if (!this.modifications[wid].links) this.modifications[wid].links = {};

            this.modifications[wid].links[key] = {
                href: url,
                target: target,
                text: $a.text().trim()
            };

            this.pushHistory(wid);
            this.save(wid);
        },

        // ============================================
        // IMAGE EDITING WITH DRAG RESIZE
        // ============================================
        setupImages: function($output, wid) {
            var self = this;

            $output.find('img').each(function(idx) {
                var $img = $(this);
                if ($img.data('m-i')) return;
                $img.data('m-i', true);
                $img.data('m-idx', idx);

                $img.css({ cursor: 'pointer', transition: 'outline 0.2s' });

                // Hover
                $img.on('mouseenter.m', function() {
                    if (!$(this).data('m-selected')) {
                        $(this).css({ 'outline': '3px solid rgba(108,99,255,0.5)', 'outline-offset': '3px' });
                    }
                }).on('mouseleave.m', function() {
                    if (!$(this).data('m-selected')) {
                        $(this).css('outline', 'none');
                    }
                });

                // Click - show image controls
                $img.on('click.m', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    self.selectImage($(this), wid);
                });
            });
        },

        selectImage: function($img, wid) {
            var self = this;
            var $body = this.getBody();
            if (!$body) return;

            // Deselect previous
            $body.find('[data-m-selected]').removeData('m-selected').css('outline', 'none');
            $body.find('.m-img-controls').remove();
            $body.find('.m-resize-handle').remove();

            $img.data('m-selected', true);
            $img.css({ 'outline': '3px solid #6C63FF', 'outline-offset': '3px' });

            var offset = $img.offset();
            var imgW = $img.width();
            var imgH = $img.height();

            // --- Resize Handle (bottom-right corner) ---
            var $handle = $('<div class="m-resize-handle"></div>').css({
                position: 'absolute',
                width: '16px',
                height: '16px',
                background: '#6C63FF',
                borderRadius: '3px',
                cursor: 'nwse-resize',
                zIndex: 999998,
                top: (offset.top + imgH - 8) + 'px',
                left: (offset.left + imgW - 8) + 'px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
            });

            $body.append($handle);

            // Drag to resize
            var startX, startY, startW, startH, ratio;

            $handle.on('mousedown', function(e) {
                e.preventDefault();
                self.resizing = true;
                startX = e.pageX;
                startY = e.pageY;
                startW = $img.width();
                startH = $img.height();
                ratio = startW / startH;

                var $doc = self.getDoc();

                $doc.on('mousemove.resize', function(e2) {
                    var dx = e2.pageX - startX;
                    var newW = Math.max(30, startW + dx);
                    var newH = Math.round(newW / ratio);

                    $img.css({ width: newW + 'px', height: newH + 'px' });
                    $img.attr('width', newW);
                    $img.attr('height', newH);

                    // Update handle position
                    var newOffset = $img.offset();
                    $handle.css({
                        top: (newOffset.top + newH - 8) + 'px',
                        left: (newOffset.left + newW - 8) + 'px'
                    });

                    // Update size label
                    $body.find('.m-img-size-label').text(newW + ' × ' + newH);
                });

                $doc.on('mouseup.resize', function() {
                    $doc.off('mousemove.resize mouseup.resize');
                    self.resizing = false;
                    self.saveImage($img, wid);
                });
            });

            // --- Image Controls Bar ---
            var $controls = $('<div class="m-img-controls"></div>').css({
                position: 'absolute',
                zIndex: 999999,
                top: (offset.top - 48) + 'px',
                left: Math.max(10, offset.left) + 'px',
                background: '#1a1a2e',
                borderRadius: '10px',
                padding: '6px 10px',
                display: 'flex',
                gap: '6px',
                alignItems: 'center',
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                border: '1px solid rgba(108,99,255,0.3)'
            });

            // Replace image button
            var $replace = this.mkBtn('📷', 'تغيير الصورة');
            $replace.on('mousedown', function(e) {
                e.preventDefault();
                self.pickImage($img, $img.data('m-idx'), wid);
            });

            // Size label
            var $sizeLabel = $('<span class="m-img-size-label"></span>').css({
                color: '#aaa', fontSize: '11px', padding: '0 8px', userSelect: 'none'
            }).text(Math.round($img.width()) + ' × ' + Math.round($img.height()));

            // Border radius
            var currentRadius = parseInt($img.css('border-radius')) || 0;
            var $radiusDown = this.mkBtn('◻', 'تقليل الحواف');
            var $radiusLabel = $('<span></span>').css({ color: '#aaa', fontSize: '10px', minWidth: '25px', textAlign: 'center' }).text(currentRadius);
            var $radiusUp = this.mkBtn('◯', 'زيادة الحواف');

            $radiusDown.on('mousedown', function(e) {
                e.preventDefault();
                currentRadius = Math.max(0, currentRadius - 2);
                $img.css('border-radius', currentRadius + 'px');
                $radiusLabel.text(currentRadius);
                self.saveImage($img, wid);
            });

            $radiusUp.on('mousedown', function(e) {
                e.preventDefault();
                currentRadius = Math.min(200, currentRadius + 2);
                $img.css('border-radius', currentRadius + 'px');
                $radiusLabel.text(currentRadius);
                self.saveImage($img, wid);
            });

            var $sep = function() { return $('<div>').css({ width: '1px', height: '24px', background: '#333' }); };

            $controls.append($replace, $sep(), $sizeLabel, $sep(), $radiusDown, $radiusLabel, $radiusUp);

            $body.append($controls);

            // Click elsewhere to deselect
            var $doc = this.getDoc();
            $doc.on('click.imgdeselect', function(e) {
                if (!$(e.target).is($img) && !$(e.target).closest('.m-img-controls, .m-resize-handle').length) {
                    $img.removeData('m-selected').css('outline', 'none');
                    $body.find('.m-img-controls, .m-resize-handle').remove();
                    $doc.off('click.imgdeselect');
                }
            });
        },

        pickImage: function($img, idx, wid) {
            var self = this;
            var mediaFrame;

            // Use parent window's wp.media
            var wpMedia = (window.parent && window.parent.wp && window.parent.wp.media) ? window.parent.wp.media : (wp && wp.media ? wp.media : null);

            if (!wpMedia) {
                alert('مكتبة الوسائط مش متاحة');
                return;
            }

            mediaFrame = wpMedia({
                title: '📷 اختر صورة جديدة',
                button: { text: 'استخدم الصورة دي' },
                multiple: false,
                library: { type: 'image' }
            });

            mediaFrame.on('select', function() {
                var att = mediaFrame.state().get('selection').first().toJSON();
                $img.attr('src', att.url);

                self.saveImage($img, wid);

                if (typeof elementor !== 'undefined') {
                    elementor.notifications.showToast({
                        message: '✅ تم تغيير الصورة!',
                        duration: 2500
                    });
                }
            });

            mediaFrame.open();
        },

        saveImage: function($img, wid) {
            var idx = $img.data('m-idx') || 0;
            this.ensureMods(wid);
            if (!this.modifications[wid].images) this.modifications[wid].images = {};

            this.modifications[wid].images[idx] = {
                src: $img.attr('src'),
                width: Math.round($img.width()),
                height: Math.round($img.height()),
                borderRadius: parseInt($img.css('border-radius')) || 0
            };

            this.pushHistory(wid);
            this.save(wid);
        },

        // ============================================
        // CONTAINER / DIV EDITING
        // ============================================
        setupContainers: function($output, wid) {
            var self = this;

            $output.find('div, section, article, header, footer').each(function() {
                var $div = $(this);
                if ($div.data('m-c')) return;
                if ($div.hasClass('momentum-html-output')) return;
                $div.data('m-c', true);

                $div.on('mouseenter.m', function(e) {
                    e.stopPropagation();
                    if (!self.resizing) {
                        $(this).css({ 'outline': '1px dashed rgba(255,152,0,0.3)', 'outline-offset': '1px' });
                    }
                }).on('mouseleave.m', function() {
                    $(this).css('outline', 'none');
                });
            });
        },

        // ============================================
        // KEYBOARD SHORTCUTS
        // ============================================
        setupKeyboard: function($output, wid) {
            var self = this;
            var $doc = this.getDoc();
            if (!$doc) return;

            // Prevent duplicate bindings
            if ($doc.data('m-keys')) return;
            $doc.data('m-keys', true);

            $doc.on('keydown', function(e) {
                // Ctrl+Z = Undo
                if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
                    e.preventDefault();
                    // Find active widget
                    var $active = $doc.find('.momentum-html-output').first();
                    if ($active.length) {
                        self.undo($active.data('widget-id'));
                    }
                }

                // Ctrl+Y or Ctrl+Shift+Z = Redo
                if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
                    e.preventDefault();
                    var $active = $doc.find('.momentum-html-output').first();
                    if ($active.length) {
                        self.redo($active.data('widget-id'));
                    }
                }
            });
        },

        // ============================================
        // UNDO / REDO
        // ============================================
        pushHistory: function(wid) {
            if (!this.history[wid]) this.history[wid] = [];

            // Remove future states if we're in the middle of history
            var idx = this.historyIndex[wid];
            if (idx !== undefined && idx < this.history[wid].length - 1) {
                this.history[wid] = this.history[wid].slice(0, idx + 1);
            }

            // Deep clone current modifications
            var snapshot = JSON.parse(JSON.stringify(this.modifications[wid] || {}));
            this.history[wid].push(snapshot);

            // Limit history
            if (this.history[wid].length > this.maxHistory) {
                this.history[wid].shift();
            }

            this.historyIndex[wid] = this.history[wid].length - 1;
        },

        undo: function(wid) {
            if (!this.history[wid] || this.historyIndex[wid] <= 0) {
                this.notify('⚠️ مفيش حاجة للتراجع عنها');
                return;
            }

            this.historyIndex[wid]--;
            var snapshot = JSON.parse(JSON.stringify(this.history[wid][this.historyIndex[wid]]));
            this.modifications[wid] = snapshot;
            this.save(wid);
            this.refreshWidget(wid);
            this.notify('↩ تم التراجع');
        },

        redo: function(wid) {
            if (!this.history[wid] || this.historyIndex[wid] >= this.history[wid].length - 1) {
                this.notify('⚠️ مفيش حاجة للإعادة');
                return;
            }

            this.historyIndex[wid]++;
            var snapshot = JSON.parse(JSON.stringify(this.history[wid][this.historyIndex[wid]]));
            this.modifications[wid] = snapshot;
            this.save(wid);
            this.refreshWidget(wid);
            this.notify('↪ تم الإعادة');
        },

        refreshWidget: function(wid) {
            try {
                var widget = this.findWidget(elementor.elements, wid);
                if (widget) {
                    widget.renderRemoteServer();
                }
            } catch(e) {
                console.log('Refresh error:', e);
            }
        },

        // ============================================
        // SAVE & HELPERS
        // ============================================
        saveStyle: function($el, wid, prop, val) {
            var key = this.getKey($el);
            this.ensureMods(wid);

            if (!this.modifications[wid].texts[key]) this.modifications[wid].texts[key] = {};
            this.modifications[wid].texts[key][prop] = val;

            this.pushHistory(wid);
            this.save(wid);
        },

        getKey: function($el) {
            var tag = $el.prop('tagName').toLowerCase();
            var $output = $el.closest('.momentum-html-output');
            var index = $output.find(tag).index($el);
            return tag + ':' + index;
        },

        ensureMods: function(wid) {
            if (!this.modifications[wid]) {
                this.modifications[wid] = { texts: {}, images: {}, links: {} };
            }
            if (!this.modifications[wid].texts) this.modifications[wid].texts = {};
            if (!this.modifications[wid].images) this.modifications[wid].images = {};
            if (!this.modifications[wid].links) this.modifications[wid].links = {};
        },

        save: function(wid) {
            try {
                var json = JSON.stringify(this.modifications[wid] || {});
                var widget = this.findWidget(elementor.elements, wid);
                if (widget) widget.setSetting('saved_modifications', json);
            } catch(e) {
                console.log('Save error:', e);
            }
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
        },

        notify: function(msg) {
            if (typeof elementor !== 'undefined') {
                elementor.notifications.showToast({ message: msg, duration: 2000 });
            }
        },

        rgbHex: function(rgb) {
            if (!rgb) return '#333333';
            if (rgb.charAt(0) === '#') return rgb;
            var m = rgb.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/);
            if (!m) return '#333333';
            return '#' + ((1 << 24) + (parseInt(m[1]) << 16) + (parseInt(m[2]) << 8) + parseInt(m[3])).toString(16).slice(1);
        }
    };

    // ============================================
    // GLOBAL RESET
    // ============================================
    window.momentumResetModifications = function() {
        if (!confirm('متأكد إنك عايز تحذف كل التعديلات؟')) return;
        try {
            var view = elementor.getPanelView().getCurrentPageView().getOption('editedElementView');
            if (view) {
                var wid = view.model.get('id');
                Momentum.modifications[wid] = {};
                Momentum.history[wid] = [];
                Momentum.historyIndex[wid] = -1;
                view.model.setSetting('saved_modifications', '{}');
                view.render();
                Momentum.notify('✅ تم إعادة تعيين كل التعديلات');
            }
        } catch(e) {}
    };

    // ============================================
    // START
    // ============================================
    function boot() {
        if (typeof elementor !== 'undefined') {
            Momentum.init();
        } else {
            setTimeout(boot, 1000);
        }
    }

    $(window).on('elementor:init', function() { setTimeout(boot, 1000); });
    $(document).ready(function() { setTimeout(boot, 2000); });

    window.MomentumInlineEditor = Momentum;

})(jQuery);
