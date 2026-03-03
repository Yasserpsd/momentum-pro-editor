(function($) {
    'use strict';

    var M = {
        mods: {},
        history: {},
        histIdx: {},
        maxH: 50,
        ready: false,
        setupRunning: false,
        pinned: {},          // Track pinned toolbar state per widget
        retryCount: 0,
        maxRetries: 30,

        init: function() {
            if (this.ready) return;

            var isEditor = $('body').hasClass('elementor-editor-active')
                        || $('body').hasClass('elementor-page')
                        || (typeof elementorFrontend !== 'undefined'
                            && typeof elementorFrontend.isEditMode === 'function'
                            && elementorFrontend.isEditMode());

            if (!isEditor) return;

            this.ready = true;
            this.setup();
            this.watchDOM();
            this.listenReset();
            this.listenCodeSynced();
            console.log('[Momentum] Parser: Active v3.0');
        },

        // ============================================
        // ROBUST INITIALIZATION WITH RETRY
        // ============================================
        tryInit: function() {
            var self = this;
            if (self.ready) return;

            var $widgets = $('.momentum-html-output.momentum-editable');
            if ($widgets.length > 0) {
                self.init();
            } else if (self.retryCount < self.maxRetries) {
                self.retryCount++;
                setTimeout(function() { self.tryInit(); }, 500);
            }
        },

        listenReset: function() {
            var self = this;
            window.addEventListener('message', function(e) {
                if (!e.data || e.data.type !== 'momentum-reset') return;
                var wid = e.data.widgetId;
                if (wid && self.mods[wid]) {
                    self.mods[wid] = { texts: {}, images: {}, links: {}, boxes: {} };
                    self.history[wid] = [];
                    self.histIdx[wid] = -1;
                    var $w = $('.momentum-html-output[data-widget-id="' + wid + '"]');
                    if ($w.length) {
                        $w.removeData('m3');
                        $w.find('*').removeData();
                    }
                    setTimeout(function() { self.setup(); }, 500);
                }
            });
        },

        listenCodeSynced: function() {
            var self = this;
            window.addEventListener('message', function(e) {
                if (!e.data || e.data.type !== 'momentum-code-synced') return;
                var wid = e.data.widgetId;
                if (wid) {
                    // Clear local mods since they're now in the code
                    self.mods[wid] = { texts: {}, images: {}, links: {}, boxes: {} };
                    self.history[wid] = [];
                    self.histIdx[wid] = -1;
                    console.log('[Momentum] Code synced, mods cleared for:', wid);
                }
            });
        },

        // ============================================
        // ROBUST DOM WATCHER
        // ============================================
        watchDOM: function() {
            var self = this;
            var debounce = null;

            var observer = new MutationObserver(function(mutations) {
                var dominated = false;
                for (var i = 0; i < mutations.length; i++) {
                    if (mutations[i].addedNodes.length > 0) {
                        for (var j = 0; j < mutations[i].addedNodes.length; j++) {
                            var node = mutations[i].addedNodes[j];
                            if (node.nodeType === 1) {
                                if ($(node).hasClass('momentum-html-output') || $(node).find('.momentum-html-output').length > 0) {
                                    dominated = true;
                                    break;
                                }
                            }
                        }
                    }
                    if (dominated) break;
                }

                if (dominated) {
                    if (debounce) clearTimeout(debounce);
                    debounce = setTimeout(function() {
                        self.setup();
                    }, 300);
                }
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true
            });

            // Also re-scan periodically (backup for edge cases)
            setInterval(function() {
                var $unseen = $('.momentum-html-output.momentum-editable').not(function() {
                    return $(this).data('m3');
                });
                if ($unseen.length > 0) {
                    self.setup();
                }
            }, 3000);
        },

        // ============================================
        // SETUP WIDGETS
        // ============================================
        setup: function() {
            if (this.setupRunning) return;
            this.setupRunning = true;

            var self = this;

            try {
                $('.momentum-html-output.momentum-editable').each(function() {
                    var $w = $(this);
                    if ($w.data('m3')) return;
                    $w.data('m3', true);

                    var wid = $w.data('widget-id');
                    if (!wid) {
                        console.warn('[Momentum] Widget has no ID');
                        return;
                    }

                    console.log('[Momentum] Setting up widget:', wid);

                    // Load saved mods
                    if (!self.mods[wid]) {
                        var savedMods = $w.attr('data-mods');
                        if (savedMods && savedMods !== '{}') {
                            try {
                                self.mods[wid] = JSON.parse(savedMods);
                                if (!self.mods[wid].texts) self.mods[wid].texts = {};
                                if (!self.mods[wid].images) self.mods[wid].images = {};
                                if (!self.mods[wid].links) self.mods[wid].links = {};
                                if (!self.mods[wid].boxes) self.mods[wid].boxes = {};
                            } catch(e) {
                                self.mods[wid] = { texts: {}, images: {}, links: {}, boxes: {} };
                            }
                        } else {
                            self.mods[wid] = { texts: {}, images: {}, links: {}, boxes: {} };
                        }
                    }

                    if (!self.history[wid]) {
                        self.history[wid] = [];
                        self.histIdx[wid] = -1;
                    }

                    self.scanTexts($w, wid);
                    self.scanImages($w, wid);
                    self.scanLinks($w, wid);
                    self.scanBoxes($w, wid);
                    self.setupKeys(wid);
                    self.addBadge($w);
                });
            } finally {
                self.setupRunning = false;
            }
        },

        // ============================================
        // BADGE
        // ============================================
        addBadge: function($w) {
            if ($w.find('.m-badge').length) return;
            var $badge = $('<div class="m-badge">').css({
                position: 'absolute', top: '8px', right: '8px',
                background: 'linear-gradient(135deg,#6C63FF,#4CAF50)',
                color: '#fff', fontSize: '10px', fontWeight: '700',
                padding: '4px 10px', borderRadius: '20px', zIndex: 100,
                pointerEvents: 'none', fontFamily: 'sans-serif',
                boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
            }).text('Momentum Pro v3');
            $w.css('position', 'relative');
            $w.prepend($badge);
        },

        // ============================================
        // TEXT SCANNING
        // ============================================
        scanTexts: function($w, wid) {
            var self = this;
            var skip = [
                'script','style','svg','path','circle','rect','line','polygon',
                'polyline','ellipse','g','defs','clippath','use','symbol',
                'br','hr','img','input','select','textarea','video','audio',
                'canvas','iframe','object','embed','noscript','template'
            ];

            $w.find('*').each(function() {
                var el  = this;
                var $el = $(this);

                if ($el.data('m-t3')) return;

                var tag = (el.tagName || '').toLowerCase();
                if (!tag) return;
                if (skip.indexOf(tag) !== -1) return;
                if ($el.hasClass('m-badge')) return;
                if ($el.closest('#m-toolbar, #m-link-editor, .m-img-bar, .m-box-bar').length) return;
                if (self.isIcon(el)) return;

                var hasText = false;
                var txt = '';
                for (var i = 0; i < el.childNodes.length; i++) {
                    if (el.childNodes[i].nodeType === 3 && el.childNodes[i].textContent.trim().length > 0) {
                        hasText = true;
                        txt += el.childNodes[i].textContent.trim();
                    }
                }
                if (!hasText || txt.length === 0) return;
                if (txt.length <= 2 && $el.find('svg, i[class], [class*="icon"]').length > 0) return;

                $el.data('m-t3', true);
                $el.attr('contenteditable', 'true');
                $el.css({ 'cursor': 'text', 'outline': 'none' });

                if (tag === 'a') {
                    $el.on('click.m', function(e) { e.preventDefault(); });
                }

                $el.on('mouseenter.m', function(e) {
                    e.stopPropagation();
                    if (!$(this).is(':focus')) {
                        $(this).css({ 'outline': '2px dashed rgba(108,99,255,0.4)', 'outline-offset': '2px' });
                    }
                }).on('mouseleave.m', function() {
                    if (!$(this).is(':focus')) {
                        $(this).css('outline', 'none');
                    }
                });

                $el.on('focus.m', function(e) {
                    e.stopPropagation();
                    $(this).css({ 'outline': '2px solid #6C63FF', 'outline-offset': '3px' });
                    self.showToolbar($(this), wid);
                });

                $el.on('blur.m', function() {
                    $(this).css('outline', 'none');
                    self.saveText($(this), wid);
                    // Only hide if NOT pinned
                    setTimeout(function() {
                        if (!self.isToolbarPinned(wid)) {
                            self.maybeHide();
                        }
                    }, 400);
                });

                $el.on('input.m', function() {
                    self.debounceSaveText($(this), wid);
                });
            });
        },

        isIcon: function(el) {
            var $el = $(el);
            var tag = (el.tagName || '').toLowerCase();

            if (tag === 'svg' || tag === 'i') {
                if ($el.text().trim().length <= 1) return true;
            }
            if ($el.find('svg').length > 0 && $el.children().length > 0) {
                var t = '';
                for (var i = 0; i < el.childNodes.length; i++) {
                    if (el.childNodes[i].nodeType === 3) t += el.childNodes[i].textContent.trim();
                }
                if (t.length <= 2) return true;
            }

            var cls = (el.className || '').toString();
            if (/\b(fa|fas|far|fab|fal|fad|dashicons|eicon|ti-|glyphicon|material-icons|icon)\b/i.test(cls)) return true;

            return false;
        },

        _saveTextTimer: null,
        debounceSaveText: function($el, wid) {
            var self = this;
            if (self._saveTextTimer) clearTimeout(self._saveTextTimer);
            self._saveTextTimer = setTimeout(function() {
                self.saveText($el, wid);
            }, 300);
        },

        saveText: function($el, wid) {
            var key = this.getKey($el, wid);
            if (!key) return;

            if (!this.mods[wid]) this.mods[wid] = { texts: {}, images: {}, links: {}, boxes: {} };
            if (!this.mods[wid].texts) this.mods[wid].texts = {};
            if (!this.mods[wid].texts[key]) this.mods[wid].texts[key] = {};

            var t = '';
            for (var i = 0; i < $el[0].childNodes.length; i++) {
                if ($el[0].childNodes[i].nodeType === 3) {
                    t += $el[0].childNodes[i].textContent;
                }
            }
            this.mods[wid].texts[key].text = t.trim() || $el.text().trim();
            this.pushH(wid);
            this.save(wid);
        },

        // ============================================
        // TOOLBAR WITH PIN BUTTON
        // ============================================
        isToolbarPinned: function(wid) {
            return this.pinned[wid] === true;
        },

        showToolbar: function($el, wid) {
            var self = this;
            this.hideAll();

            var off  = $el.offset();
            var $bar = this.createBar(off, $el);
            $bar.data('wid', wid);
            $bar.data('target-el', $el);

            // ===== PIN BUTTON =====
            var isPinned = self.isToolbarPinned(wid);
            var $pin = this.btn(isPinned ? '📌' : '📍', 'Pin/Unpin Toolbar', isPinned);
            $pin.addClass('m-pin-btn');
            $pin.css({
                fontSize: '14px',
                background: isPinned ? '#6C63FF' : '#2a2a3e',
                border: isPinned ? '2px solid #fff' : '2px solid transparent'
            });
            $pin.on('mousedown', function(e) {
                e.preventDefault();
                self.pinned[wid] = !self.pinned[wid];
                var p = self.pinned[wid];
                $(this).text(p ? '📌' : '📍');
                $(this).css({
                    background: p ? '#6C63FF' : '#2a2a3e',
                    border: p ? '2px solid #fff' : '2px solid transparent'
                });
                if (p) {
                    self.notify('Toolbar pinned! Click 📌 to unpin');
                } else {
                    self.notify('Toolbar unpinned');
                }
            });

            // ===== BOLD =====
            var $b = this.btn('B', 'Bold', this.isBold($el)).css('font-weight', 'bold');
            $b.on('mousedown', function(e) {
                e.preventDefault();
                var on = self.isBold($el);
                $el.css('font-weight', on ? 'normal' : 'bold');
                $(this).css('background', on ? '#2a2a3e' : '#6C63FF');
                self.saveSty($el, wid, 'fontWeight', on ? 'normal' : 'bold');
            });

            // ===== ITALIC =====
            var $i = this.btn('I', 'Italic', $el.css('font-style') === 'italic').css('font-style', 'italic');
            $i.on('mousedown', function(e) {
                e.preventDefault();
                var on = $el.css('font-style') === 'italic';
                $el.css('font-style', on ? 'normal' : 'italic');
                $(this).css('background', on ? '#2a2a3e' : '#6C63FF');
                self.saveSty($el, wid, 'fontStyle', on ? 'normal' : 'italic');
            });

            // ===== UNDERLINE =====
            var $u = this.btn('U', 'Underline', $el.css('text-decoration').indexOf('underline') !== -1).css('text-decoration', 'underline');
            $u.on('mousedown', function(e) {
                e.preventDefault();
                var on = $el.css('text-decoration').indexOf('underline') !== -1;
                $el.css('text-decoration', on ? 'none' : 'underline');
                $(this).css('background', on ? '#2a2a3e' : '#6C63FF');
                self.saveSty($el, wid, 'textDecoration', on ? 'none' : 'underline');
            });

            // ===== TEXT ALIGN =====
            var al  = $el.css('text-align') || 'right';
            var $aR = this.btn('⫷', 'Right', al === 'right' || al === 'start').attr('data-al', 'right');
            var $aC = this.btn('≡', 'Center', al === 'center').attr('data-al', 'center');
            var $aL = this.btn('⫸', 'Left', al === 'left' || al === 'end').attr('data-al', 'left');

            [$aR, $aC, $aL].forEach(function($btn) {
                $btn.on('mousedown', function(e) {
                    e.preventDefault();
                    var a = $(this).attr('data-al');
                    $el.css('text-align', a);
                    $bar.find('[data-al]').css('background', '#2a2a3e');
                    $(this).css('background', '#6C63FF');
                    self.saveSty($el, wid, 'textAlign', a);
                });
            });

            // ===== FONT SIZE =====
            var sz   = parseInt($el.css('font-size')) || 16;
            var $szD = this.btn('−', 'Font Size -');
            var $szL = $('<span>').css({ color: '#fff', fontSize: '11px', minWidth: '36px', textAlign: 'center', userSelect: 'none', display: 'inline-block' }).text(sz + 'px');
            var $szU = this.btn('+', 'Font Size +');

            $szD.on('mousedown', function(e) {
                e.preventDefault();
                sz = Math.max(6, sz - 1);
                $el.css('font-size', sz + 'px');
                $szL.text(sz + 'px');
                self.saveSty($el, wid, 'fontSize', sz + 'px');
            });
            $szU.on('mousedown', function(e) {
                e.preventDefault();
                sz = Math.min(200, sz + 1);
                $el.css('font-size', sz + 'px');
                $szL.text(sz + 'px');
                self.saveSty($el, wid, 'fontSize', sz + 'px');
            });

            // ===== LINE HEIGHT =====
            var lh = parseFloat($el.css('line-height')) / (parseInt($el.css('font-size')) || 16);
            lh = Math.round(lh * 10) / 10 || 1.5;
            var $lhD = this.btn('↕−', 'Line Height -');
            var $lhL = $('<span>').css({ color: '#aaa', fontSize: '10px', minWidth: '26px', textAlign: 'center', display: 'inline-block' }).text(lh.toFixed(1));
            var $lhU = this.btn('↕+', 'Line Height +');

            $lhD.on('mousedown', function(e) {
                e.preventDefault();
                lh = Math.max(0.5, Math.round((lh - 0.1) * 10) / 10);
                $el.css('line-height', lh);
                $lhL.text(lh.toFixed(1));
                self.saveSty($el, wid, 'lineHeight', String(lh));
            });
            $lhU.on('mousedown', function(e) {
                e.preventDefault();
                lh = Math.min(5, Math.round((lh + 0.1) * 10) / 10);
                $el.css('line-height', lh);
                $lhL.text(lh.toFixed(1));
                self.saveSty($el, wid, 'lineHeight', String(lh));
            });

            // ===== LETTER SPACING =====
            var ls = parseFloat($el.css('letter-spacing')) || 0;
            var $lsD = this.btn('A−', 'Letter Spacing -');
            var $lsL = $('<span>').css({ color: '#aaa', fontSize: '10px', minWidth: '30px', textAlign: 'center', display: 'inline-block' }).text(ls.toFixed(1));
            var $lsU = this.btn('A+', 'Letter Spacing +');

            $lsD.on('mousedown', function(e) {
                e.preventDefault();
                ls = Math.max(-5, Math.round((ls - 0.5) * 10) / 10);
                $el.css('letter-spacing', ls + 'px');
                $lsL.text(ls.toFixed(1));
                self.saveSty($el, wid, 'letterSpacing', ls + 'px');
            });
            $lsU.on('mousedown', function(e) {
                e.preventDefault();
                ls = Math.min(20, Math.round((ls + 0.5) * 10) / 10);
                $el.css('letter-spacing', ls + 'px');
                $lsL.text(ls.toFixed(1));
                self.saveSty($el, wid, 'letterSpacing', ls + 'px');
            });

            // ===== TEXT TRANSFORM =====
            var tt = $el.css('text-transform') || 'none';
            var $ttUpper = this.btn('AA', 'Uppercase', tt === 'uppercase');
            var $ttCap   = this.btn('Aa', 'Capitalize', tt === 'capitalize');
            var $ttNone  = this.btn('aa', 'None', tt === 'none' || tt === 'initial');

            [$ttUpper, $ttCap, $ttNone].forEach(function($btn) {
                $btn.on('mousedown', function(e) {
                    e.preventDefault();
                    var val = $(this).text() === 'AA' ? 'uppercase' : ($(this).text() === 'Aa' ? 'capitalize' : 'none');
                    $el.css('text-transform', val);
                    [$ttUpper, $ttCap, $ttNone].forEach(function(b) { b.css('background', '#2a2a3e'); });
                    $(this).css('background', '#6C63FF');
                    self.saveSty($el, wid, 'textTransform', val);
                });
            });

            // ===== OPACITY =====
            var op = parseFloat($el.css('opacity')) || 1;
            var $opD = this.btn('◐−', 'Opacity -');
            var $opL = $('<span>').css({ color: '#aaa', fontSize: '10px', minWidth: '26px', textAlign: 'center', display: 'inline-block' }).text(Math.round(op * 100) + '%');
            var $opU = this.btn('◐+', 'Opacity +');

            $opD.on('mousedown', function(e) {
                e.preventDefault();
                op = Math.max(0.05, Math.round((op - 0.05) * 100) / 100);
                $el.css('opacity', op);
                $opL.text(Math.round(op * 100) + '%');
                self.saveSty($el, wid, 'opacity', String(op));
            });
            $opU.on('mousedown', function(e) {
                e.preventDefault();
                op = Math.min(1, Math.round((op + 0.05) * 100) / 100);
                $el.css('opacity', op);
                $opL.text(Math.round(op * 100) + '%');
                self.saveSty($el, wid, 'opacity', String(op));
            });

            // ===== COLORS =====
            var $clr = this.colorPick($el, 'color', 'Text Color', wid);
            var $bg  = this.colorPick($el, 'background-color', 'BG Color', wid);

            // ===== BORDER RADIUS =====
            var br = parseInt($el.css('border-radius')) || 0;
            var $brD = this.btn('◻', 'Border Radius -');
            var $brL = $('<span>').css({ color: '#aaa', fontSize: '10px', minWidth: '22px', textAlign: 'center', display: 'inline-block' }).text(br);
            var $brU = this.btn('◉', 'Border Radius +');

            $brD.on('mousedown', function(e) {
                e.preventDefault();
                br = Math.max(0, br - 2);
                $el.css('border-radius', br + 'px');
                $brL.text(br);
                self.saveSty($el, wid, 'borderRadius', br + 'px');
            });
            $brU.on('mousedown', function(e) {
                e.preventDefault();
                br += 2;
                $el.css('border-radius', br + 'px');
                $brL.text(br);
                self.saveSty($el, wid, 'borderRadius', br + 'px');
            });

            // ===== LINK =====
            var $link = this.btn('🔗', 'Link');
            $link.on('mousedown', function(e) {
                e.preventDefault();
                self.showLinkPopup($el, wid);
            });

            // ===== UNDO / REDO =====
            var $undo = this.btn('↩', 'Undo');
            $undo.on('mousedown', function(e) { e.preventDefault(); self.undo(wid); });
            var $redo = this.btn('↪', 'Redo');
            $redo.on('mousedown', function(e) { e.preventDefault(); self.redo(wid); });

            var s = function() { return self.sep(); };

            // ===== ROW 1: Basic formatting =====
            var $row1 = $('<div>').css({ display: 'flex', gap: '3px', alignItems: 'center', flexWrap: 'wrap' });
            $row1.append($pin, s(), $b, $i, $u, s(), $aR, $aC, $aL, s(), $szD, $szL, $szU, s(), $clr, $bg);

            // ===== ROW 2: Advanced options =====
            var $row2 = $('<div>').css({ display: 'flex', gap: '3px', alignItems: 'center', flexWrap: 'wrap', marginTop: '4px', paddingTop: '4px', borderTop: '1px solid #333' });
            $row2.append($lhD, $lhL, $lhU, s(), $lsD, $lsL, $lsU, s(), $ttUpper, $ttCap, $ttNone, s(), $opD, $opL, $opU, s(), $brD, $brL, $brU, s(), $link, s(), $undo, $redo);

            $bar.append($row1, $row2);
            $('body').append($bar);
            this.fixPos($bar, off, $el);
        },

        // ============================================
        // LINK POPUP
        // ============================================
        showLinkPopup: function($el, wid) {
            var self = this;
            $('#m-link-editor').remove();

            var off   = $el.offset();
            var is    = 'width:100%;padding:8px 12px;border:1px solid #333;border-radius:6px;background:#2a2a3e;color:#fff;font-size:13px;margin-top:4px;box-sizing:border-box;outline:none;';
            var href  = $el.is('a') ? ($el.attr('href') || '') : '';
            var txt   = $el.text().trim();
            var blank = $el.is('a') ? ($el.attr('target') === '_blank') : false;

            var $ed = $('<div id="m-link-editor">').css({
                position: 'absolute', zIndex: 999999,
                top: (off.top + $el.outerHeight() + 8) + 'px',
                left: Math.max(10, off.left) + 'px',
                background: '#1a1a2e', borderRadius: '12px', padding: '16px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                border: '1px solid rgba(108,99,255,0.3)',
                width: '300px', fontFamily: 'sans-serif'
            }).on('mousedown', function(e) { e.stopPropagation(); });

            $ed.html(
                '<div style="color:#6C63FF;font-weight:700;font-size:14px;margin-bottom:12px;">🔗 Link Editor</div>' +
                '<label style="color:#aaa;font-size:11px;display:block;margin-bottom:10px;">URL<input type="url" id="ml-url" value="' + self.escAttr(href) + '" placeholder="https://example.com" style="' + is + '"></label>' +
                '<label style="color:#aaa;font-size:11px;display:block;margin-bottom:10px;">Text<input type="text" id="ml-txt" value="' + self.escAttr(txt) + '" style="' + is + '"></label>' +
                '<label style="color:#aaa;font-size:11px;display:flex;align-items:center;gap:8px;margin-bottom:12px;cursor:pointer;"><input type="checkbox" id="ml-blank" ' + (blank ? 'checked' : '') + '> Open in new tab</label>' +
                '<div style="display:flex;gap:8px;justify-content:flex-end;">' +
                '<button id="ml-x" style="padding:7px 14px;border:none;border-radius:6px;background:#333;color:#fff;cursor:pointer;">Cancel</button>' +
                ($el.is('a') ? '<button id="ml-del" style="padding:7px 14px;border:none;border-radius:6px;background:#e74c3c;color:#fff;cursor:pointer;">Remove</button>' : '') +
                '<button id="ml-ok" style="padding:7px 14px;border:none;border-radius:6px;background:#6C63FF;color:#fff;cursor:pointer;font-weight:600;">Save</button>' +
                '</div>'
            );

            $('body').append($ed);
            $ed.find('#ml-url').focus();

            // SAVE LINK
            $ed.find('#ml-ok').on('click', function() {
                var url = $ed.find('#ml-url').val().trim();
                var t   = $ed.find('#ml-txt').val().trim();
                var bl  = $ed.find('#ml-blank').is(':checked');

                if (!url) { alert('Please enter a URL'); return; }

                if ($el.is('a')) {
                    $el.attr('href', url);
                    if (t) {
                        var hasChildEls = false;
                        $el.children().each(function() {
                            if (this.nodeType === 1) { hasChildEls = true; return false; }
                        });
                        if (!hasChildEls) {
                            $el.text(t);
                        }
                    }
                    if (bl) {
                        $el.attr('target', '_blank').attr('rel', 'noopener noreferrer');
                    } else {
                        $el.removeAttr('target').removeAttr('rel');
                    }

                    if (!self.mods[wid].links) self.mods[wid].links = {};
                    var $w = $el.closest('.momentum-html-output');
                    var linkIndex = $w.find('a').index($el);
                    if (linkIndex >= 0) {
                        var linkKey = 'a:' + linkIndex;
                        self.mods[wid].links[linkKey] = {
                            href: url,
                            text: t || $el.text().trim(),
                            target: bl ? '_blank' : '_self'
                        };
                    }

                    var textKey = self.getKey($el, wid);
                    if (textKey && self.mods[wid].texts && self.mods[wid].texts[textKey]) {
                        self.mods[wid].texts[textKey].text = t || $el.text().trim();
                    }

                } else {
                    var $a = $('<a>').attr('href', url).text(t || $el.text());
                    $a.css({ color: $el.css('color'), textDecoration: 'underline' });
                    if (bl) $a.attr('target', '_blank').attr('rel', 'noopener noreferrer');
                    $el.empty().append($a);

                    var $w2 = $el.closest('.momentum-html-output');
                    self.scanLinks($w2, wid);
                }

                self.pushH(wid);
                self.save(wid);
                $ed.remove();
                self.notify('Link saved ✅');
            });

            // REMOVE LINK
            if ($el.is('a')) {
                $ed.find('#ml-del').on('click', function() {
                    var t2 = $el.text();

                    if (self.mods[wid].links) {
                        var $w = $el.closest('.momentum-html-output');
                        var linkIndex = $w.find('a').index($el);
                        if (linkIndex >= 0) {
                            delete self.mods[wid].links['a:' + linkIndex];
                        }
                    }

                    var textKey = self.getKey($el, wid);
                    if (textKey && self.mods[wid].texts) {
                        delete self.mods[wid].texts[textKey];
                    }

                    $el.replaceWith(t2);
                    self.pushH(wid);
                    self.save(wid);
                    $ed.remove();
                    self.notify('Link removed');
                });
            }

            $ed.find('#ml-x').on('click', function() { $ed.remove(); });

            setTimeout(function() {
                $(document).on('click.mlinked', function(e) {
                    if (!$(e.target).closest('#m-link-editor').length) {
                        $ed.remove();
                        $(document).off('click.mlinked');
                    }
                });
            }, 100);
        },

        escAttr: function(str) {
            if (!str) return '';
            return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        },

        scanLinks: function($w, wid) {
            var self = this;
            $w.find('a').each(function() {
                var $a = $(this);
                if ($a.data('m-lk3')) return;
                $a.data('m-lk3', true);
                $a.on('dblclick.m', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    self.showLinkPopup($(this), wid);
                });
            });
        },

        // ============================================
        // BOX EDITING
        // ============================================
        scanBoxes: function($w, wid) {
            var self = this;
            $w.find('div, section, article, header, footer, ul, ol, table, blockquote, aside, nav, main').each(function() {
                var $box = $(this);
                if ($box.data('m-bx3')) return;
                if ($box.hasClass('momentum-html-output')) return;
                if ($box.closest('#m-toolbar, #m-link-editor, .m-img-bar, .m-box-bar').length) return;
                $box.data('m-bx3', true);

                $box.on('contextmenu.m', function(e) {
                    if (e.target !== this && !$(e.target).is('div, section, article')) return;
                    e.preventDefault();
                    e.stopPropagation();
                    self.showBoxBar($(this), wid);
                });

                $box.on('mouseenter.m', function(e) {
                    e.stopPropagation();
                    if (!$(this).data('m-bx-sel')) {
                        $(this).css({ 'outline': '1px dashed rgba(255,152,0,0.35)', 'outline-offset': '1px' });
                    }
                }).on('mouseleave.m', function() {
                    if (!$(this).data('m-bx-sel')) {
                        $(this).css('outline', 'none');
                    }
                });
            });
        },

        showBoxBar: function($box, wid) {
            var self = this;
            this.hideAll();
            $('.m-box-bar').remove();

            $box.data('m-bx-sel', true);
            $box.css({ 'outline': '2px solid #FF9800', 'outline-offset': '2px' });
            var off = $box.offset();

            var $bar = $('<div class="m-box-bar">').css({
                position: 'absolute', zIndex: 999999,
                top: Math.max(5, off.top - 48) + 'px',
                left: Math.max(10, off.left) + 'px',
                background: '#1a1a2e', borderRadius: '10px', padding: '5px 8px',
                display: 'flex', gap: '4px', alignItems: 'center',
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                border: '1px solid rgba(255,152,0,0.4)',
                flexWrap: 'wrap', maxWidth: '500px'
            }).on('mousedown', function(e) { e.preventDefault(); });

            var tag    = $box.prop('tagName').toLowerCase();
            var $label = $('<span>').css({ color: '#FF9800', fontSize: '11px', fontWeight: '600', padding: '0 6px', fontFamily: 'monospace' }).text(tag);
            var s = function() { return self.sep(); };

            var $up = this.btn('⬆', 'Move Up');
            $up.on('mousedown', function(e) {
                e.preventDefault();
                var $prev = $box.prev();
                if ($prev.length && !$prev.hasClass('m-badge')) {
                    $box.insertBefore($prev);
                    self.pushH(wid); self.save(wid);
                    self.notify('Moved up');
                    self.showBoxBar($box, wid);
                }
            });

            var $down = this.btn('⬇', 'Move Down');
            $down.on('mousedown', function(e) {
                e.preventDefault();
                var $next = $box.next();
                if ($next.length && !$next.hasClass('m-badge')) {
                    $box.insertAfter($next);
                    self.pushH(wid); self.save(wid);
                    self.notify('Moved down');
                    self.showBoxBar($box, wid);
                }
            });

            var $dup = this.btn('📋', 'Duplicate');
            $dup.on('mousedown', function(e) {
                e.preventDefault();
                var $clone = $box.clone(true);
                $clone.removeData('m-bx3').removeData('m-bx-sel');
                $clone.find('*').removeData();
                $box.after($clone);
                setTimeout(function() {
                    var $w2 = $clone.closest('.momentum-html-output');
                    self.scanTexts($w2, wid);
                    self.scanImages($w2, wid);
                    self.scanLinks($w2, wid);
                    self.scanBoxes($w2, wid);
                }, 100);
                self.pushH(wid); self.save(wid);
                self.notify('Duplicated');
            });

            var $del = this.btn('🗑', 'Delete');
            $del.css('background', '#5c1a1a');
            $del.on('mousedown', function(e) {
                e.preventDefault();
                if (confirm('Delete this box?')) {
                    $box.fadeOut(200, function() {
                        $(this).remove();
                        self.pushH(wid); self.save(wid);
                        self.notify('Deleted');
                    });
                    self.hideAll();
                    $('.m-box-bar').remove();
                }
            });

            // Padding controls
            var pad  = parseInt($box.css('padding')) || 0;
            var $padD = this.btn('P-', 'Padding -');
            var $padL = $('<span>').css({ color: '#aaa', fontSize: '10px', minWidth: '24px', textAlign: 'center', display: 'inline-block' }).text(pad);
            var $padU = this.btn('P+', 'Padding +');

            $padD.on('mousedown', function(e) { e.preventDefault(); pad = Math.max(0, pad - 5); $box.css('padding', pad + 'px'); $padL.text(pad); self.saveBoxSty($box, wid, 'padding', pad + 'px'); });
            $padU.on('mousedown', function(e) { e.preventDefault(); pad += 5; $box.css('padding', pad + 'px'); $padL.text(pad); self.saveBoxSty($box, wid, 'padding', pad + 'px'); });

            // Margin controls
            var mg  = parseInt($box.css('margin')) || 0;
            var $mgD = this.btn('M-', 'Margin -');
            var $mgL = $('<span>').css({ color: '#aaa', fontSize: '10px', minWidth: '24px', textAlign: 'center', display: 'inline-block' }).text(mg);
            var $mgU = this.btn('M+', 'Margin +');

            $mgD.on('mousedown', function(e) { e.preventDefault(); mg = Math.max(0, mg - 5); $box.css('margin', mg + 'px'); $mgL.text(mg); self.saveBoxSty($box, wid, 'margin', mg + 'px'); });
            $mgU.on('mousedown', function(e) { e.preventDefault(); mg += 5; $box.css('margin', mg + 'px'); $mgL.text(mg); self.saveBoxSty($box, wid, 'margin', mg + 'px'); });

            // Border Radius
            var brd = parseInt($box.css('border-radius')) || 0;
            var $brdD = this.btn('R-', 'Radius -');
            var $brdL = $('<span>').css({ color: '#aaa', fontSize: '10px', minWidth: '22px', textAlign: 'center', display: 'inline-block' }).text(brd);
            var $brdU = this.btn('R+', 'Radius +');

            $brdD.on('mousedown', function(e) { e.preventDefault(); brd = Math.max(0, brd - 2); $box.css('border-radius', brd + 'px'); $brdL.text(brd); self.saveBoxSty($box, wid, 'borderRadius', brd + 'px'); });
            $brdU.on('mousedown', function(e) { e.preventDefault(); brd += 2; $box.css('border-radius', brd + 'px'); $brdL.text(brd); self.saveBoxSty($box, wid, 'borderRadius', brd + 'px'); });

            var $bgClr = this.colorPick($box, 'background-color', 'BG', wid);

            $bar.append($label, s(), $up, $down, s(), $dup, $del, s(), $padD, $padL, $padU, s(), $mgD, $mgL, $mgU, s(), $brdD, $brdL, $brdU, s(), $bgClr);
            $('body').append($bar);

            $(document).on('click.mboxdesel', function(e) {
                if (!$(e.target).closest('.m-box-bar').length && !$(e.target).is($box)) {
                    $box.removeData('m-bx-sel').css('outline', 'none');
                    $('.m-box-bar').remove();
                    $(document).off('click.mboxdesel');
                }
            });
        },

        saveBoxSty: function($box, wid, prop, val) {
            var key = this.getKey($box, wid);
            if (!key) return;

            if (!this.mods[wid]) this.mods[wid] = { texts: {}, images: {}, links: {}, boxes: {} };
            if (!this.mods[wid].texts) this.mods[wid].texts = {};
            if (!this.mods[wid].texts[key]) this.mods[wid].texts[key] = {};
            this.mods[wid].texts[key][prop] = val;
            this.pushH(wid);
            this.save(wid);
        },

        // ============================================
        // IMAGE EDITING
        // ============================================
        scanImages: function($w, wid) {
            var self = this;
            $w.find('img').each(function(idx) {
                var $img = $(this);
                if ($img.data('m-i3')) return;
                $img.data('m-i3', true);
                $img.data('m-idx', idx);
                $img.css({ cursor: 'pointer', transition: 'outline 0.15s' });

                $img.on('mouseenter.m', function() {
                    if (!$(this).data('m-sel')) $(this).css({ 'outline': '3px solid rgba(108,99,255,0.5)', 'outline-offset': '3px' });
                }).on('mouseleave.m', function() {
                    if (!$(this).data('m-sel')) $(this).css('outline', 'none');
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
            $('[data-m-sel]').removeData('m-sel').css('outline', 'none');
            $('.m-img-bar,.m-resize-h').remove();
            this.hideAll();

            $img.data('m-sel', true);
            $img.css({ 'outline': '3px solid #6C63FF', 'outline-offset': '3px' });

            var off = $img.offset(), w = $img.width(), h = $img.height();

            // Resize handle
            var $rh = $('<div class="m-resize-h">').css({
                position: 'absolute', width: '14px', height: '14px',
                background: '#6C63FF', borderRadius: '3px', cursor: 'nwse-resize', zIndex: 999998,
                top: (off.top + h - 7) + 'px', left: (off.left + w - 7) + 'px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
            });
            $('body').append($rh);

            var sx, sw, sh, ratio;
            $rh.on('mousedown', function(e) {
                e.preventDefault();
                sx = e.pageX; sw = $img.width(); sh = $img.height(); ratio = sw / sh;
                $(document).on('mousemove.mr', function(e2) {
                    var nw = Math.max(30, sw + (e2.pageX - sx));
                    var nh = Math.round(nw / ratio);
                    $img.css({ width: nw + 'px', height: nh + 'px' }).attr({ width: nw, height: nh });
                    var no = $img.offset();
                    $rh.css({ top: (no.top + nh - 7) + 'px', left: (no.left + nw - 7) + 'px' });
                    $('.m-img-bar .m-sz').text(nw + 'x' + nh);
                });
                $(document).on('mouseup.mr', function() {
                    $(document).off('mousemove.mr mouseup.mr');
                    self.saveImg($img, wid);
                });
            });

            var $bar = $('<div class="m-img-bar">').css({
                position: 'absolute', zIndex: 999999,
                top: Math.max(5, off.top - 48) + 'px', left: Math.max(10, off.left) + 'px',
                background: '#1a1a2e', borderRadius: '10px', padding: '5px 10px',
                display: 'flex', gap: '6px', alignItems: 'center',
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)', border: '1px solid rgba(108,99,255,0.3)',
                flexWrap: 'wrap', maxWidth: '450px'
            }).on('mousedown', function(e) { e.preventDefault(); });

            var $rep = this.btn('🖼', 'Replace Image');
            $rep.on('mousedown', function(e) { e.preventDefault(); self.pickImg($img, wid); });

            var $sz = $('<span class="m-sz">').css({ color: '#aaa', fontSize: '11px', padding: '0 6px' }).text(Math.round(w) + 'x' + Math.round(h));

            // Border Radius
            var rad = parseInt($img.css('border-radius')) || 0;
            var $rd = this.btn('R-', 'Radius -');
            var $rl = $('<span>').css({ color: '#aaa', fontSize: '10px', minWidth: '20px', textAlign: 'center', display: 'inline-block' }).text(rad);
            var $ru = this.btn('R+', 'Radius +');

            $rd.on('mousedown', function(e) { e.preventDefault(); rad = Math.max(0, rad - 2); $img.css('border-radius', rad + 'px'); $rl.text(rad); self.saveImg($img, wid); });
            $ru.on('mousedown', function(e) { e.preventDefault(); rad += 2; $img.css('border-radius', rad + 'px'); $rl.text(rad); self.saveImg($img, wid); });

            // Opacity
            var iop = parseFloat($img.css('opacity')) || 1;
            var $iopD = this.btn('◐-', 'Opacity -');
            var $iopL = $('<span>').css({ color: '#aaa', fontSize: '10px', minWidth: '26px', textAlign: 'center', display: 'inline-block' }).text(Math.round(iop * 100) + '%');
            var $iopU = this.btn('◐+', 'Opacity +');

            $iopD.on('mousedown', function(e) { e.preventDefault(); iop = Math.max(0.05, Math.round((iop - 0.05) * 100) / 100); $img.css('opacity', iop); $iopL.text(Math.round(iop * 100) + '%'); self.saveImg($img, wid); });
            $iopU.on('mousedown', function(e) { e.preventDefault(); iop = Math.min(1, Math.round((iop + 0.05) * 100) / 100); $img.css('opacity', iop); $iopL.text(Math.round(iop * 100) + '%'); self.saveImg($img, wid); });

            // Shadow toggle
            var hasShadow = $img.css('box-shadow') !== 'none' && $img.css('box-shadow') !== '';
            var $shadow = this.btn('💫', 'Shadow', hasShadow);
            $shadow.on('mousedown', function(e) {
                e.preventDefault();
                hasShadow = !hasShadow;
                $img.css('box-shadow', hasShadow ? '0 4px 20px rgba(0,0,0,0.3)' : 'none');
                $(this).css('background', hasShadow ? '#6C63FF' : '#2a2a3e');
                self.saveImg($img, wid);
            });

            $bar.append($rep, self.sep(), $sz, self.sep(), $rd, $rl, $ru, self.sep(), $iopD, $iopL, $iopU, self.sep(), $shadow);
            $('body').append($bar);

            $(document).on('click.mid', function(e) {
                if (!$(e.target).is($img) && !$(e.target).closest('.m-img-bar,.m-resize-h').length) {
                    $img.removeData('m-sel').css('outline', 'none');
                    $('.m-img-bar,.m-resize-h').remove();
                    $(document).off('click.mid');
                }
            });
        },

        pickImg: function($img, wid) {
            var self = this;
            if (typeof wp === 'undefined' || !wp.media) { alert('Media library not available'); return; }
            var f = wp.media({ title: 'Select Image', button: { text: 'Use' }, multiple: false, library: { type: 'image' } });
            f.on('select', function() {
                var a = f.state().get('selection').first().toJSON();
                $img.attr('src', a.url);
                self.saveImg($img, wid);
                setTimeout(function() { self.selectImg($img, wid); }, 100);
            });
            f.open();
        },

        saveImg: function($img, wid) {
            var idx = $img.data('m-idx');
            if (typeof idx === 'undefined') idx = 0;

            if (!this.mods[wid]) this.mods[wid] = { texts: {}, images: {}, links: {}, boxes: {} };
            if (!this.mods[wid].images) this.mods[wid].images = {};
            this.mods[wid].images[idx] = {
                src: $img.attr('src'),
                width: Math.round($img.width()),
                height: Math.round($img.height()),
                borderRadius: parseInt($img.css('border-radius')) || 0,
                opacity: parseFloat($img.css('opacity')) || 1,
                boxShadow: $img.css('box-shadow') !== 'none' ? $img.css('box-shadow') : ''
            };
            this.pushH(wid);
            this.save(wid);
        },

        // ============================================
        // UI HELPERS
        // ============================================
        createBar: function(off, $el) {
            return $('<div id="m-toolbar">').css({
                position: 'absolute', zIndex: 999999,
                top: Math.max(5, off.top - 100) + 'px',
                left: Math.max(10, off.left) + 'px',
                background: '#1a1a2e', borderRadius: '12px', padding: '8px 10px',
                display: 'flex', flexDirection: 'column',
                boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
                border: '1px solid rgba(108,99,255,0.3)',
                maxWidth: '600px'
            }).on('mousedown', function(e) {
                if (!$(e.target).is('input')) e.preventDefault();
            });
        },

        fixPos: function($bar, off, $el) {
            setTimeout(function() {
                var bw = $bar.outerWidth(), bh = $bar.outerHeight(), ww = $(window).width();
                if (parseInt($bar.css('left')) + bw > ww - 20) $bar.css('left', Math.max(10, ww - bw - 20) + 'px');
                if (off.top - bh - 10 < 5) $bar.css('top', (off.top + $el.outerHeight() + 8) + 'px');
            }, 10);
        },

        btn: function(text, title, active) {
            return $('<button>').text(text).attr('title', title).css({
                background: active ? '#6C63FF' : '#2a2a3e', color: '#fff',
                border: 'none', borderRadius: '6px', width: '28px', height: '28px',
                cursor: 'pointer', fontSize: '12px', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                transition: 'background 0.15s', flexShrink: 0
            }).on('mouseenter', function() {
                if ($(this).css('background-color') !== 'rgb(108, 99, 255)') {
                    $(this).css('background', '#3a3a5e');
                }
            }).on('mouseleave', function() {
                if ($(this).css('background-color') === 'rgb(58, 58, 94)') {
                    $(this).css('background', '#2a2a3e');
                }
            });
        },

        sep: function() {
            return $('<div>').css({ width: '1px', height: '22px', background: '#333', flexShrink: 0 });
        },

        colorPick: function($el, prop, title, wid) {
            var self    = this;
            var cur     = self.toHex($el.css(prop));
            var isTrans = ($el.css(prop) === 'rgba(0, 0, 0, 0)' || $el.css(prop) === 'transparent');

            var $input = $('<input type="color">').val(isTrans ? '#ffffff' : (cur || '#333333')).css({
                width: '28px', height: '28px', border: '2px solid #444',
                borderRadius: '6px', cursor: 'pointer', padding: '0', background: 'none', flexShrink: 0
            }).attr('title', title);

            var colorTimer = null;
            $input.on('input change', function() {
                var val = $(this).val();
                var camelProp = prop.replace(/-([a-z])/g, function(m, c) { return c.toUpperCase(); });
                $el.css(prop, val);

                if (colorTimer) clearTimeout(colorTimer);
                colorTimer = setTimeout(function() {
                    self.saveSty($el, wid, camelProp, val);
                }, 200);
            });

            $input.on('focus', function() {
                $input.data('m-color-active', true);
            }).on('blur', function() {
                $input.removeData('m-color-active');
            });

            return $input;
        },

        isBold: function($el) {
            var fw = $el.css('font-weight');
            return fw === '700' || fw === 'bold' || parseInt(fw) >= 600;
        },

        saveSty: function($el, wid, prop, val) {
            var key = this.getKey($el, wid);
            if (!key) return;

            if (!this.mods[wid]) this.mods[wid] = { texts: {}, images: {}, links: {}, boxes: {} };
            if (!this.mods[wid].texts) this.mods[wid].texts = {};
            if (!this.mods[wid].texts[key]) this.mods[wid].texts[key] = {};
            this.mods[wid].texts[key][prop] = val;
            this.pushH(wid);
            this.save(wid);
        },

        getKey: function($el, wid) {
            var tag = ($el.prop('tagName') || 'div').toLowerCase();
            var $w  = $el.closest('.momentum-html-output');
            var idx = $w.find(tag).index($el);

            if (idx < 0) return null;
            return tag + ':' + idx;
        },

        toHex: function(rgb) {
            if (!rgb) return '#333333';
            if (rgb.charAt(0) === '#') return rgb;
            var m = rgb.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/);
            if (!m) return '#333333';
            return '#' + ((1 << 24) + (+m[1] << 16) + (+m[2] << 8) + +m[3]).toString(16).slice(1);
        },

        maybeHide: function() {
            var $f = $(':focus');
            if ($f.closest('#m-toolbar, #m-link-editor').length) return;
            if ($f.attr('contenteditable') === 'true') return;
            if ($f.is('input[type="color"]')) return;
            if ($('#m-toolbar').find('input[type="color"]').data('m-color-active')) return;
            if ($('#m-link-editor').length > 0) return;

            // Check if any widget toolbar is pinned
            var anyPinned = false;
            for (var k in this.pinned) {
                if (this.pinned[k]) { anyPinned = true; break; }
            }
            if (anyPinned) return;

            this.hideAll();
        },

        hideAll: function() {
            // Don't hide if pinned
            var bar = document.getElementById('m-toolbar');
            if (bar) {
                var wid = $(bar).data('wid');
                if (wid && this.pinned[wid]) return;
            }
            $('#m-toolbar, #m-link-editor').remove();
        },

        // ============================================
        // KEYBOARD
        // ============================================
        setupKeys: function(wid) {
            if ($(document).data('m-k3')) return;
            $(document).data('m-k3', true);
            var self = this;

            $(document).on('keydown.m', function(e) {
                var w = self.activeWid();
                if (!w) return;
                if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); self.undo(w); }
                if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); self.redo(w); }

                // Escape unpins and hides toolbar
                if (e.key === 'Escape') {
                    self.pinned[w] = false;
                    self.hideAllForce();
                }
            });
        },

        hideAllForce: function() {
            $('#m-toolbar, #m-link-editor').remove();
        },

        activeWid: function() {
            var $focused = $(':focus').closest('.momentum-html-output');
            if ($focused.length) return $focused.data('widget-id');

            var $w = $('.momentum-html-output.momentum-editable').first();
            return $w.length ? $w.data('widget-id') : null;
        },

        // ============================================
        // HISTORY
        // ============================================
        pushH: function(wid) {
            if (!this.mods[wid]) return;
            if (!this.history[wid]) { this.history[wid] = []; this.histIdx[wid] = -1; }
            var i = this.histIdx[wid];
            if (i < this.history[wid].length - 1) this.history[wid] = this.history[wid].slice(0, i + 1);
            this.history[wid].push(JSON.parse(JSON.stringify(this.mods[wid])));
            if (this.history[wid].length > this.maxH) this.history[wid].shift();
            this.histIdx[wid] = this.history[wid].length - 1;
        },

        undo: function(wid) {
            if (!this.history[wid] || this.histIdx[wid] <= 0) { this.notify('Nothing to undo'); return; }
            this.histIdx[wid]--;
            this.mods[wid] = JSON.parse(JSON.stringify(this.history[wid][this.histIdx[wid]]));
            this.save(wid);
            this.notify('Undo ↩');
        },

        redo: function(wid) {
            if (!this.history[wid] || this.histIdx[wid] >= this.history[wid].length - 1) { this.notify('Nothing to redo'); return; }
            this.histIdx[wid]++;
            this.mods[wid] = JSON.parse(JSON.stringify(this.history[wid][this.histIdx[wid]]));
            this.save(wid);
            this.notify('Redo ↪');
        },

        // ============================================
        // SAVE TO ELEMENTOR
        // ============================================
        save: function(wid) {
            var $w = $('.momentum-html-output[data-widget-id="' + wid + '"]');
            var autoSync = $w.attr('data-auto-sync') || '';

            try {
                window.parent.postMessage({
                    type: 'momentum-save',
                    widgetId: wid,
                    modifications: this.mods[wid],
                    autoSync: autoSync
                }, '*');
            } catch(e) {
                console.error('[Momentum] Save postMessage error:', e);
            }
        },

        // ============================================
        // NOTIFICATION
        // ============================================
        notify: function(msg) {
            var $n = $('<div class="m-notify">').text(msg).css({
                position: 'fixed', bottom: '20px', left: '50%',
                transform: 'translateX(-50%)', background: '#1a1a2e',
                color: '#fff', padding: '10px 22px', borderRadius: '10px',
                fontSize: '13px', fontWeight: '600', zIndex: 1000000,
                boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
                border: '1px solid rgba(108,99,255,0.3)',
                fontFamily: 'sans-serif', pointerEvents: 'none'
            });
            $('body').append($n);
            setTimeout(function() { $n.fadeOut(300, function() { $(this).remove(); }); }, 2000);
        }
    };

    // ============================================
    // INITIALIZATION - ROBUST
    // ============================================
    function startMomentum() {
        // Multiple initialization strategies
        if (typeof elementorFrontend !== 'undefined') {
            // Strategy 1: Elementor frontend hook
            if (elementorFrontend.hooks) {
                elementorFrontend.hooks.addAction('frontend/element_ready/momentum_html_pro.default', function($scope) {
                    console.log('[Momentum] Element ready hook fired');
                    setTimeout(function() { M.init(); }, 200);
                });
            }
        }

        // Strategy 2: Direct init with retry
        M.tryInit();

        // Strategy 3: Periodic check as final backup
        var checkCount = 0;
        var checker = setInterval(function() {
            checkCount++;
            if (M.ready || checkCount > 60) {
                clearInterval(checker);
                return;
            }
            M.tryInit();
        }, 1000);
    }

    // Start when DOM is ready
    $(document).ready(function() {
        setTimeout(startMomentum, 500);
    });

    // Also try on window load (backup)
    $(window).on('load', function() {
        setTimeout(function() {
            if (!M.ready) startMomentum();
        }, 1000);
    });

})(jQuery);
