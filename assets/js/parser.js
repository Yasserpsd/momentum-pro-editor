(function($) {
    'use strict';

    /**
     * Momentum Pro Editor v2.0 - Preview Inline Editor
     * THIS RUNS INSIDE THE PREVIEW IFRAME
     * All editing happens here directly
     */

    var M = {

        mods: {},
        history: {},
        historyIdx: {},
        maxHist: 50,
        ready: false,

        // ============================================
        // INIT
        // ============================================
        init: function() {
            if (this.ready) return;
            if (!$('body').hasClass('elementor-editor-active')) return;
            this.ready = true;

            this.setup();
            this.watch();
            console.log('Momentum Inline Editor v2.0: Active');
        },

        // ============================================
        // SETUP - Find all momentum widgets
        // ============================================
        setup: function() {
            var self = this;

            $('.momentum-html-output').each(function() {
                var $w = $(this);
                if ($w.data('m-init')) return;
                $w.data('m-init', true);

                var wid = $w.data('widget-id');
                if (!wid) return;

                // Init mods & history
                if (!self.mods[wid]) self.mods[wid] = { texts: {}, images: {}, links: {} };
                if (!self.history[wid]) { self.history[wid] = []; self.historyIdx[wid] = -1; }

                self.setupTexts($w, wid);
                self.setupImages($w, wid);
                self.setupLinks($w, wid);
                self.setupKeys(wid);
                self.addBadge($w);
            });
        },

        // ============================================
        // TEXT EDITING
        // ============================================
        setupTexts: function($w, wid) {
            var self = this;
            var tags = 'h1,h2,h3,h4,h5,h6,p,span,li,td,th,label,blockquote,small';

            $w.find(tags).each(function() {
                var $el = $(this);
                var el = this;

                // SKIP elements that are icons, SVGs, or have no real text
                if (self.isIconElement(el)) return;
                if ($el.data('m-txt')) return;

                // Check for direct text content
                var hasDirectText = false;
                for (var i = 0; i < el.childNodes.length; i++) {
                    var node = el.childNodes[i];
                    if (node.nodeType === 3 && node.textContent.trim().length > 0) {
                        hasDirectText = true;
                        break;
                    }
                }

                // Skip if no direct text and has child elements
                if (!hasDirectText && $el.children().length > 0) return;

                // Skip very short content that might be icons
                var textLen = $el.text().trim().length;
                if (textLen === 0) return;
                if (textLen <= 2 && $el.find('svg, i, img, .fa, .icon, [class*="icon"]').length > 0) return;

                $el.data('m-txt', true);
                $el.attr('contenteditable', 'true');
                $el.css({ 'cursor': 'text', 'outline': 'none' });

                // Focus
                $el.on('focus.m', function() {
                    $(this).css({
                        'outline': '2px solid #6C63FF',
                        'outline-offset': '3px'
                    });
                    self.showToolbar($(this), wid);
                });

                // Blur
                $el.on('blur.m', function() {
                    $(this).css({ 'outline': 'none' });
                    self.saveText($(this), wid);
                    setTimeout(function() { self.maybeHideToolbar(); }, 300);
                });

                // Live save
                $el.on('input.m', function() {
                    self.saveText($(this), wid);
                });

                // Hover
                $el.on('mouseenter.m', function() {
                    if (!$(this).is(':focus')) {
                        $(this).css({ 'outline': '2px dashed rgba(108,99,255,0.4)', 'outline-offset': '2px' });
                    }
                }).on('mouseleave.m', function() {
                    if (!$(this).is(':focus')) {
                        $(this).css('outline', 'none');
                    }
                });
            });

            // Also handle <a> tags for text editing (but not for link editing)
            $w.find('a').each(function() {
                var $a = $(this);
                if (self.isIconElement(this)) return;
                if ($a.data('m-txt')) return;
                if ($a.text().trim().length === 0) return;

                $a.data('m-txt', true);
                $a.attr('contenteditable', 'true');
                $a.css({ 'cursor': 'text', 'outline': 'none' });

                $a.on('click.m', function(e) { e.preventDefault(); });

                $a.on('focus.m', function() {
                    $(this).css({ 'outline': '2px solid #6C63FF', 'outline-offset': '3px' });
                    self.showToolbar($(this), wid);
                });

                $a.on('blur.m', function() {
                    $(this).css('outline', 'none');
                    self.saveText($(this), wid);
                    setTimeout(function() { self.maybeHideToolbar(); }, 300);
                });

                $a.on('input.m', function() {
                    self.saveText($(this), wid);
                });

                $a.on('mouseenter.m', function() {
                    if (!$(this).is(':focus')) {
                        $(this).css({ 'outline': '2px dashed rgba(108,99,255,0.4)', 'outline-offset': '2px' });
                    }
                }).on('mouseleave.m', function() {
                    if (!$(this).is(':focus')) {
                        $(this).css('outline', 'none');
                    }
                });
            });
        },

        // Check if element is an icon (SVG, font icon, emoji-only, etc)
        isIconElement: function(el) {
            var $el = $(el);

            // Is SVG or contains SVG
            if (el.tagName === 'SVG' || el.tagName === 'svg') return true;
            if ($el.find('svg').length > 0 && $el.text().trim().length <= 2) return true;

            // Is icon font (FontAwesome, etc)
            var classes = (el.className || '').toString();
            if (/\b(fa|fas|far|fab|fal|fad|icon|dashicons|eicon|ti-|glyphicon|material-icons)\b/i.test(classes)) return true;

            // Has icon-related class
            if (/icon/i.test(classes)) return true;

            // Contains only emoji or special characters (1-2 chars)
            var text = $el.text().trim();
            if (text.length <= 2 && /[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE00}-\u{FEFF}]/u.test(text)) return true;

            // Element is an <i> tag with no meaningful text (likely icon font)
            if (el.tagName === 'I' && text.length === 0) return true;
            if (el.tagName === 'I' && $el.children().length === 0 && text.length <= 1) return true;

            return false;
        },

        saveText: function($el, wid) {
            var key = this.getKey($el, wid);
            if (!this.mods[wid].texts[key]) this.mods[wid].texts[key] = {};

            var text = '';
            for (var i = 0; i < $el[0].childNodes.length; i++) {
                if ($el[0].childNodes[i].nodeType === 3) {
                    text += $el[0].childNodes[i].textContent;
                }
            }
            text = text.trim() || $el.text().trim();

            this.mods[wid].texts[key].text = text;
            this.pushHist(wid);
            this.save(wid);
        },

        // ============================================
        // TOOLBAR
        // ============================================
        showToolbar: function($el, wid) {
            var self = this;
            this.hideToolbar();

            var offset = $el.offset();

            var $bar = $('<div id="m-toolbar"></div>').css({
                position: 'absolute',
                zIndex: 999999,
                top: Math.max(5, offset.top - 52) + 'px',
                left: Math.max(10, offset.left) + 'px',
                background: '#1a1a2e',
                borderRadius: '12px',
                padding: '5px 8px',
                display: 'flex',
                gap: '3px',
                alignItems: 'center',
                boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
                border: '1px solid rgba(108,99,255,0.3)',
                flexWrap: 'wrap',
                maxWidth: '520px'
            });

            // Prevent toolbar clicks from blurring the element
            $bar.on('mousedown', function(e) {
                // Don't prevent default on inputs
                if ($(e.target).is('input')) return;
                e.preventDefault();
            });

            var sep = function() { return $('<div>').css({ width: '1px', height: '22px', background: '#333', flexShrink: 0 }); };

            // --- BOLD ---
            var isBold = self.isBold($el);
            var $bold = self.btn('B', 'عريض', isBold).css('font-weight', 'bold');
            $bold.on('mousedown', function(e) {
                e.preventDefault();
                var b = self.isBold($el);
                $el.css('font-weight', b ? 'normal' : 'bold');
                $(this).css('background', b ? '#2a2a3e' : '#6C63FF');
                self.saveStyle($el, wid, 'fontWeight', b ? 'normal' : 'bold');
            });

            // --- ITALIC ---
            var isIt = $el.css('font-style') === 'italic';
            var $italic = self.btn('I', 'مائل', isIt).css('font-style', 'italic');
            $italic.on('mousedown', function(e) {
                e.preventDefault();
                var it = $el.css('font-style') === 'italic';
                $el.css('font-style', it ? 'normal' : 'italic');
                $(this).css('background', it ? '#2a2a3e' : '#6C63FF');
                self.saveStyle($el, wid, 'fontStyle', it ? 'normal' : 'italic');
            });

            // --- UNDERLINE ---
            var isUn = $el.css('text-decoration').indexOf('underline') !== -1;
            var $under = self.btn('U', 'تحته خط', isUn).css('text-decoration', 'underline');
            $under.on('mousedown', function(e) {
                e.preventDefault();
                var u = $el.css('text-decoration').indexOf('underline') !== -1;
                $el.css('text-decoration', u ? 'none' : 'underline');
                $(this).css('background', u ? '#2a2a3e' : '#6C63FF');
                self.saveStyle($el, wid, 'textDecoration', u ? 'none' : 'underline');
            });

            // --- ALIGN ---
            var align = $el.css('text-align') || 'right';
            var $aR = self.btn('⫷', 'يمين', align === 'right' || align === 'start').attr('data-al', 'right');
            var $aC = self.btn('≡', 'وسط', align === 'center').attr('data-al', 'center');
            var $aL = self.btn('⫸', 'شمال', align === 'left' || align === 'end').attr('data-al', 'left');

            $.each([$aR, $aC, $aL], function(_, $b) {
                $b.on('mousedown', function(e) {
                    e.preventDefault();
                    var a = $(this).attr('data-al');
                    $el.css('text-align', a);
                    $bar.find('[data-al]').css('background', '#2a2a3e');
                    $(this).css('background', '#6C63FF');
                    self.saveStyle($el, wid, 'textAlign', a);
                });
            });

            // --- FONT SIZE ---
            var sz = parseInt($el.css('font-size')) || 16;
            var $szD = self.btn('−', 'تصغير');
            var $szL = $('<span>').css({ color: '#fff', fontSize: '11px', minWidth: '36px', textAlign: 'center', userSelect: 'none' }).text(sz + 'px');
            var $szU = self.btn('+', 'تكبير');

            $szD.on('mousedown', function(e) {
                e.preventDefault();
                sz = Math.max(6, sz - 1);
                $el.css('font-size', sz + 'px');
                $szL.text(sz + 'px');
                self.saveStyle($el, wid, 'fontSize', sz + 'px');
            });
            $szU.on('mousedown', function(e) {
                e.preventDefault();
                sz = Math.min(200, sz + 1);
                $el.css('font-size', sz + 'px');
                $szL.text(sz + 'px');
                self.saveStyle($el, wid, 'fontSize', sz + 'px');
            });

            // --- LINE HEIGHT ---
            var lh = parseFloat($el.css('line-height')) / (parseInt($el.css('font-size')) || 16);
            lh = Math.round(lh * 10) / 10 || 1.5;
            var $lhD = self.btn('↕−', 'تقليل المسافة');
            var $lhL = $('<span>').css({ color: '#aaa', fontSize: '10px', minWidth: '28px', textAlign: 'center' }).text(lh.toFixed(1));
            var $lhU = self.btn('↕+', 'زيادة المسافة');

            $lhD.on('mousedown', function(e) {
                e.preventDefault();
                lh = Math.max(0.5, Math.round((lh - 0.1) * 10) / 10);
                $el.css('line-height', lh);
                $lhL.text(lh.toFixed(1));
                self.saveStyle($el, wid, 'lineHeight', String(lh));
            });
            $lhU.on('mousedown', function(e) {
                e.preventDefault();
                lh = Math.min(5, Math.round((lh + 0.1) * 10) / 10);
                $el.css('line-height', lh);
                $lhL.text(lh.toFixed(1));
                self.saveStyle($el, wid, 'lineHeight', String(lh));
            });

            // --- TEXT COLOR ---
            var clr = self.toHex($el.css('color')) || '#333333';
            var $clr = $('<input type="color">').val(clr).css({
                width: '28px', height: '28px', border: '2px solid #444',
                borderRadius: '6px', cursor: 'pointer', padding: '0', background: 'none'
            }).attr('title', 'لون النص');

            $clr.on('input', function() {
                $el.css('color', $(this).val());
                self.saveStyle($el, wid, 'color', $(this).val());
            });

            // --- BG COLOR ---
            var bg = self.toHex($el.css('background-color'));
            var isTrans = ($el.css('background-color') === 'rgba(0, 0, 0, 0)' || $el.css('background-color') === 'transparent');
            var $bg = $('<input type="color">').val(isTrans ? '#ffffff' : (bg || '#ffffff')).css({
                width: '28px', height: '28px', border: '2px solid #444',
                borderRadius: '6px', cursor: 'pointer', padding: '0', background: 'none'
            }).attr('title', 'لون الخلفية');

            $bg.on('input', function() {
                $el.css('background-color', $(this).val());
                self.saveStyle($el, wid, 'backgroundColor', $(this).val());
            });

            // --- UNDO / REDO ---
            var $undo = self.btn('↩', 'تراجع Ctrl+Z');
            $undo.on('mousedown', function(e) { e.preventDefault(); self.undo(wid); });

            var $redo = self.btn('↪', 'إعادة Ctrl+Y');
            $redo.on('mousedown', function(e) { e.preventDefault(); self.redo(wid); });

            // --- LINK BUTTON (only for <a>) ---
            var $linkBtn = null;
            var $a = $el.is('a') ? $el : ($el.closest('a').length ? $el.closest('a') : null);
            if ($a) {
                $linkBtn = self.btn('🔗', 'تعديل الرابط');
                $linkBtn.on('mousedown', function(e) {
                    e.preventDefault();
                    self.showLinkEditor($a, wid);
                });
            }

            // Build
            $bar.append($bold, $italic, $under, sep(), $aR, $aC, $aL, sep(), $szD, $szL, $szU, sep(), $lhD, $lhL, $lhU, sep(), $clr, $bg, sep(), $undo, $redo);
            if ($linkBtn) $bar.append(sep(), $linkBtn);

            $('body').append($bar);

            // Reposition if off screen
            setTimeout(function() {
                var bw = $bar.outerWidth();
                var ww = $(window).width();
                var l = parseInt($bar.css('left'));
                if (l + bw > ww - 20) $bar.css('left', Math.max(10, ww - bw - 20) + 'px');
                if (offset.top - 52 < 5) $bar.css('top', (offset.top + $el.outerHeight() + 8) + 'px');
            }, 10);
        },

        maybeHideToolbar: function() {
            // Check if anything inside toolbar or contenteditable is focused
            var $focused = $(':focus');
            if ($focused.closest('#m-toolbar').length) return;
            if ($focused.attr('contenteditable') === 'true') return;
            this.hideToolbar();
        },

        hideToolbar: function() {
            $('#m-toolbar').remove();
            $('#m-link-editor').remove();
        },

        btn: function(text, title, active) {
            return $('<button>').text(text).attr('title', title).css({
                background: active ? '#6C63FF' : '#2a2a3e',
                color: '#fff', border: 'none', borderRadius: '6px',
                width: '28px', height: '28px', cursor: 'pointer',
                fontSize: '12px', display: 'flex', alignItems: 'center',
                justifyContent: 'center', transition: 'background 0.15s', flexShrink: 0
            });
        },

        isBold: function($el) {
            var fw = $el.css('font-weight');
            return fw === '700' || fw === 'bold' || parseInt(fw) >= 600;
        },

        // ============================================
        // LINK EDITOR
        // ============================================
        setupLinks: function($w, wid) {
            var self = this;
            $w.find('a').each(function() {
                var $a = $(this);
                if ($a.data('m-lnk')) return;
                $a.data('m-lnk', true);

                $a.on('dblclick.m', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    self.showLinkEditor($(this), wid);
                });
            });
        },

        showLinkEditor: function($a, wid) {
            var self = this;
            $('#m-link-editor').remove();

            var offset = $a.offset();
            var href = $a.attr('href') || '';
            var target = $a.attr('target') || '';
            var text = $a.text().trim();

            var is = 'width:100%;padding:8px 12px;border:1px solid #333;border-radius:6px;background:#2a2a3e;color:#fff;font-size:13px;margin-top:4px;box-sizing:border-box;outline:none;';

            var $ed = $('<div id="m-link-editor"></div>').css({
                position: 'absolute', zIndex: 999999,
                top: (offset.top + $a.outerHeight() + 8) + 'px',
                left: Math.max(10, offset.left) + 'px',
                background: '#1a1a2e', borderRadius: '12px', padding: '16px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                border: '1px solid rgba(108,99,255,0.3)',
                width: '300px', fontFamily: 'sans-serif'
            });

            $ed.html(
                '<label style="color:#aaa;font-size:11px;display:block;margin-bottom:10px;">🔗 URL<input type="url" id="ml-url" value="' + href + '" placeholder="https://" style="' + is + '"></label>' +
                '<label style="color:#aaa;font-size:11px;display:block;margin-bottom:10px;">📝 النص<input type="text" id="ml-txt" value="' + text + '" style="' + is + '"></label>' +
                '<label style="color:#aaa;font-size:11px;display:flex;align-items:center;gap:8px;margin-bottom:12px;"><input type="checkbox" id="ml-blank" ' + (target === '_blank' ? 'checked' : '') + '> فتح في تاب جديد</label>' +
                '<div style="display:flex;gap:8px;justify-content:flex-end;">' +
                '<button id="ml-cancel" style="padding:7px 14px;border:none;border-radius:6px;background:#333;color:#fff;cursor:pointer;">إلغاء</button>' +
                '<button id="ml-save" style="padding:7px 14px;border:none;border-radius:6px;background:#6C63FF;color:#fff;cursor:pointer;font-weight:600;">💾 حفظ</button>' +
                '</div>'
            );

            // Prevent toolbar from hiding
            $ed.on('mousedown', function(e) { e.stopPropagation(); });

            $('body').append($ed);

            $ed.find('#ml-save').on('click', function() {
                var u = $ed.find('#ml-url').val();
                var t = $ed.find('#ml-txt').val();
                var b = $ed.find('#ml-blank').is(':checked');

                $a.attr('href', u);
                if (t) $a.text(t);
                if (b) { $a.attr('target', '_blank').attr('rel', 'noopener noreferrer'); }
                else { $a.removeAttr('target').removeAttr('rel'); }

                // Save
                var $w = $a.closest('.momentum-html-output');
                var idx = $w.find('a').index($a);
                self.mods[wid].links = self.mods[wid].links || {};
                self.mods[wid].links['a:' + idx] = { href: u, target: b ? '_blank' : '', text: t };
                self.pushHist(wid);
                self.save(wid);

                $ed.remove();
            });

            $ed.find('#ml-cancel').on('click', function() { $ed.remove(); });
        },

        // ============================================
        // IMAGE EDITING + DRAG RESIZE
        // ============================================
        setupImages: function($w, wid) {
            var self = this;

            $w.find('img').each(function(idx) {
                var $img = $(this);
                if ($img.data('m-img')) return;
                $img.data('m-img', true);
                $img.data('m-idx', idx);

                $img.css({ cursor: 'pointer', transition: 'outline 0.15s' });

                $img.on('mouseenter.m', function() {
                    if (!$(this).data('m-sel')) {
                        $(this).css({ 'outline': '3px solid rgba(108,99,255,0.5)', 'outline-offset': '3px' });
                    }
                }).on('mouseleave.m', function() {
                    if (!$(this).data('m-sel')) {
                        $(this).css('outline', 'none');
                    }
                });

                $img.on('click.m', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    self.selectImg($(this), wid);
                });
            });
        },

        selectImg: function($img, wid) {
            var self = this;

            // Deselect previous
            $('[data-m-sel]').removeData('m-sel').css('outline', 'none');
            $('.m-img-bar,.m-resize-h').remove();
            this.hideToolbar();

            $img.data('m-sel', true);
            $img.css({ 'outline': '3px solid #6C63FF', 'outline-offset': '3px' });

            var offset = $img.offset();
            var w = $img.width(), h = $img.height();

            // Resize handle
            var $handle = $('<div class="m-resize-h"></div>').css({
                position: 'absolute', width: '14px', height: '14px',
                background: '#6C63FF', borderRadius: '3px', cursor: 'nwse-resize',
                zIndex: 999998,
                top: (offset.top + h - 7) + 'px',
                left: (offset.left + w - 7) + 'px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
            });

            $('body').append($handle);

            var startX, startW, startH, ratio;
            $handle.on('mousedown', function(e) {
                e.preventDefault();
                startX = e.pageX;
                startW = $img.width();
                startH = $img.height();
                ratio = startW / startH;

                $(document).on('mousemove.mresize', function(e2) {
                    var nw = Math.max(30, startW + (e2.pageX - startX));
                    var nh = Math.round(nw / ratio);
                    $img.css({ width: nw + 'px', height: nh + 'px' });
                    $img.attr({ width: nw, height: nh });

                    var no = $img.offset();
                    $handle.css({ top: (no.top + nh - 7) + 'px', left: (no.left + nw - 7) + 'px' });
                    $('.m-img-bar .m-sz-label').text(nw + ' × ' + nh);
                });

                $(document).on('mouseup.mresize', function() {
                    $(document).off('mousemove.mresize mouseup.mresize');
                    self.saveImg($img, wid);
                });
            });

            // Image toolbar
            var $bar = $('<div class="m-img-bar"></div>').css({
                position: 'absolute', zIndex: 999999,
                top: Math.max(5, offset.top - 48) + 'px',
                left: Math.max(10, offset.left) + 'px',
                background: '#1a1a2e', borderRadius: '10px', padding: '5px 10px',
                display: 'flex', gap: '6px', alignItems: 'center',
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                border: '1px solid rgba(108,99,255,0.3)'
            });

            $bar.on('mousedown', function(e) { e.preventDefault(); });

            // Replace
            var $rep = this.btn('📷', 'تغيير الصورة');
            $rep.on('mousedown', function(e) {
                e.preventDefault();
                self.pickImg($img, wid);
            });

            // Size label
            var $szL = $('<span class="m-sz-label">').css({ color: '#aaa', fontSize: '11px', padding: '0 6px' }).text(Math.round(w) + ' × ' + Math.round(h));

            // Border radius
            var rad = parseInt($img.css('border-radius')) || 0;
            var $rD = this.btn('◻', 'حواف حادة');
            var $rL = $('<span>').css({ color: '#aaa', fontSize: '10px', minWidth: '20px', textAlign: 'center' }).text(rad);
            var $rU = this.btn('◯', 'حواف دائرية');

            $rD.on('mousedown', function(e) {
                e.preventDefault();
                rad = Math.max(0, rad - 2);
                $img.css('border-radius', rad + 'px');
                $rL.text(rad);
                self.saveImg($img, wid);
            });
            $rU.on('mousedown', function(e) {
                e.preventDefault();
                rad = Math.min(200, rad + 2);
                $img.css('border-radius', rad + 'px');
                $rL.text(rad);
                self.saveImg($img, wid);
            });

            var sep = $('<div>').css({ width: '1px', height: '22px', background: '#333' });
            $bar.append($rep, sep.clone(), $szL, sep.clone(), $rD, $rL, $rU);
            $('body').append($bar);

            // Click elsewhere to deselect
            $(document).on('click.mdesel', function(e) {
                if (!$(e.target).is($img) && !$(e.target).closest('.m-img-bar,.m-resize-h').length) {
                    $img.removeData('m-sel').css('outline', 'none');
                    $('.m-img-bar,.m-resize-h').remove();
                    $(document).off('click.mdesel');
                }
            });
        },

        pickImg: function($img, wid) {
            var self = this;

            if (typeof wp === 'undefined' || !wp.media) {
                alert('مكتبة الوسائط مش متاحة');
                return;
            }

            var frame = wp.media({
                title: '📷 اختر صورة',
                button: { text: 'استخدم الصورة' },
                multiple: false,
                library: { type: 'image' }
            });

            frame.on('select', function() {
                var att = frame.state().get('selection').first().toJSON();
                $img.attr('src', att.url);
                self.saveImg($img, wid);

                // Re-select to update toolbar
                setTimeout(function() { self.selectImg($img, wid); }, 100);
            });

            frame.open();
        },

        saveImg: function($img, wid) {
            var idx = $img.data('m-idx') || 0;
            this.mods[wid].images = this.mods[wid].images || {};

            this.mods[wid].images[idx] = {
                src: $img.attr('src'),
                width: Math.round($img.width()),
                height: Math.round($img.height()),
                borderRadius: parseInt($img.css('border-radius')) || 0
            };

            this.pushHist(wid);
            this.save(wid);
        },

        // ============================================
        // STYLE SAVE
        // ============================================
        saveStyle: function($el, wid, prop, val) {
            var key = this.getKey($el, wid);
            if (!this.mods[wid].texts[key]) this.mods[wid].texts[key] = {};
            this.mods[wid].texts[key][prop] = val;
            this.pushHist(wid);
            this.save(wid);
        },

        // ============================================
        // UNDO / REDO
        // ============================================
        setupKeys: function(wid) {
            if ($(document).data('m-keys')) return;
            $(document).data('m-keys', true);

            var self = this;
            $(document).on('keydown.m', function(e) {
                if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
                    e.preventDefault();
                    var w = self.getActiveWid();
                    if (w) self.undo(w);
                }
                if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
                    e.preventDefault();
                    var w = self.getActiveWid();
                    if (w) self.redo(w);
                }
            });
        },

        getActiveWid: function() {
            var $w = $('.momentum-html-output').first();
            return $w.length ? $w.data('widget-id') : null;
        },

        pushHist: function(wid) {
            if (!this.history[wid]) { this.history[wid] = []; this.historyIdx[wid] = -1; }
            var idx = this.historyIdx[wid];
            if (idx < this.history[wid].length - 1) {
                this.history[wid] = this.history[wid].slice(0, idx + 1);
            }
            this.history[wid].push(JSON.parse(JSON.stringify(this.mods[wid])));
            if (this.history[wid].length > this.maxHist) this.history[wid].shift();
            this.historyIdx[wid] = this.history[wid].length - 1;
        },

        undo: function(wid) {
            if (!this.history[wid] || this.historyIdx[wid] <= 0) {
                this.notify('⚠️ مفيش تراجع');
                return;
            }
            this.historyIdx[wid]--;
            this.mods[wid] = JSON.parse(JSON.stringify(this.history[wid][this.historyIdx[wid]]));
            this.save(wid);
            this.notify('↩ تم التراجع');
        },

        redo: function(wid) {
            if (!this.history[wid] || this.historyIdx[wid] >= this.history[wid].length - 1) {
                this.notify('⚠️ مفيش إعادة');
                return;
            }
            this.historyIdx[wid]++;
            this.mods[wid] = JSON.parse(JSON.stringify(this.history[wid][this.historyIdx[wid]]));
            this.save(wid);
            this.notify('↪ تم الإعادة');
        },

        // ============================================
        // SAVE TO ELEMENTOR (via postMessage)
        // ============================================
        save: function(wid) {
            try {
                window.parent.postMessage({
                    type: 'momentum-save',
                    widgetId: wid,
                    modifications: this.mods[wid]
                }, '*');
            } catch(e) {
                console.log('Momentum save error:', e);
            }
        },

        // ============================================
        // HELPERS
        // ============================================
        getKey: function($el, wid) {
            var tag = $el.prop('tagName').toLowerCase();
            var $w = $el.closest('.momentum-html-output');
            var idx = $w.find(tag).index($el);
            return tag + ':' + idx;
        },

        toHex: function(rgb) {
            if (!rgb) return '#333333';
            if (rgb.charAt(0) === '#') return rgb;
            var m = rgb.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/);
            if (!m) return '#333333';
            return '#' + ((1 << 24) + (+m[1] << 16) + (+m[2] << 8) + +m[3]).toString(16).slice(1);
        },

        notify: function(msg) {
            // Show in preview
            var $n = $('<div>').css({
                position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%)',
                background: '#1a1a2e', color: '#fff', padding: '10px 24px', borderRadius: '10px',
                fontSize: '13px', zIndex: 999999, boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                border: '1px solid rgba(108,99,255,0.3)'
            }).text(msg);
            $('body').append($n);
            setTimeout(function() { $n.fadeOut(300, function() { $n.remove(); }); }, 2000);
        },

        addBadge: function($w) {
            $w.on('mouseenter', function() {
                if ($(this).find('.m-badge').length) return;
                var $b = $('<div class="m-badge">').css({
                    position: 'absolute', top: '8px', right: '8px',
                    background: 'linear-gradient(135deg,#6C63FF,#4CAF50)',
                    color: '#fff', padding: '5px 14px', borderRadius: '20px',
                    fontSize: '11px', fontFamily: 'sans-serif', zIndex: 9999,
                    pointerEvents: 'none', boxShadow: '0 2px 12px rgba(108,99,255,0.4)'
                }).html('✏️ <b>Momentum</b> — اضغط على أي عنصر');
                $(this).css('position', 'relative').append($b);
            }).on('mouseleave', function() {
                $(this).find('.m-badge').remove();
            });
        },

        // ============================================
        // WATCH FOR NEW WIDGETS
        // ============================================
        watch: function() {
            var self = this;
            var obs = new MutationObserver(function(muts) {
                var found = false;
                muts.forEach(function(m) {
                    $(m.addedNodes).each(function() {
                        if ($(this).find('.momentum-html-output').length || $(this).hasClass('momentum-html-output')) found = true;
                    });
                });
                if (found) setTimeout(function() { self.setup(); }, 500);
            });
            obs.observe(document.body, { childList: true, subtree: true });
            setInterval(function() { self.setup(); }, 4000);
        }
    };

    // Start
    $(document).ready(function() {
        setTimeout(function() { M.init(); }, 800);
    });

    window.MomentumPreview = M;

})(jQuery);
