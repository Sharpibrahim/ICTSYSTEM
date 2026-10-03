/* ==========================================================================
   MRHS ICT CLUB MASTER — js/core/certbg.js
   Certificate backgrounds.

   Two sources, one API:
     • a built-in ornate design (cream paper, gold rule frame, corner scrollwork)
       generated here as inline SVG so it needs no network and scales to any
       paper size;
     • a club-supplied image uploaded in Settings → Club information, stored in
       IndexedDB like every other file and cached here as a data URI.

   Both are emitted as an absolutely-positioned layer inside .cert-preview, so
   the certificate markup, the print output and the downloaded HTML all carry
   the same artwork.
   ========================================================================== */
(function (global) {
  'use strict';

  var U = Utils;
  var custom = null;        /* { fileId, dataUrl } once resolved */
  var loading = null;

  /* ══ Built-in designs ═════════════════════════════════════════════════ */
  var W = 1123, H = 794;              /* A4 landscape at 96 dpi */

  /**
   * Navy & gold template — the club's certificate design: white paper, gold
   * double rule frame with bracket corners, navy angular blocks in the top
   * right and bottom left with gold bevels, and diagonal grey pinstripes.
   * Vector, so it prints sharp at any paper size.
   */
  function templateSVG() {
    var navy = '#0d2a5e', navyLight = '#173a78', grey = '#dfe2e7', greySoft = '#f3f4f6';
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none">' +
      '<defs>' +
        '<linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">' +
          '<stop offset="0" stop-color="#a8842c"/><stop offset=".35" stop-color="#e8cd8b"/>' +
          '<stop offset=".62" stop-color="#c9a24c"/><stop offset="1" stop-color="#f0dda6"/>' +
        '</linearGradient>' +
        '<linearGradient id="gold2" x1="0" y1="1" x2="1" y2="0">' +
          '<stop offset="0" stop-color="#c9a24c"/><stop offset=".5" stop-color="#f4e3b4"/>' +
          '<stop offset="1" stop-color="#b8912f"/>' +
        '</linearGradient>' +
        '<pattern id="pin" width="24" height="24" patternUnits="userSpaceOnUse">' +
          '<path d="M0 24 L24 0" stroke="' + grey + '" stroke-width="2.4"/>' +
        '</pattern>' +
      '</defs>' +

      /* paper */
      '<rect width="' + W + '" height="' + H + '" fill="#ffffff"/>' +

      /* grey pinstripe wedges — kept to the outer corners */
      '<polygon points="0,0 470,0 0,300" fill="' + greySoft + '"/>' +
      '<polygon points="0,0 392,0 0,246" fill="url(#pin)"/>' +
      '<polygon points="1123,794 742,794 1123,606" fill="' + greySoft + '"/>' +
      '<polygon points="1123,794 806,794 1123,668" fill="url(#pin)"/>' +

      /* navy blocks with a lighter bevel along the diagonal */
      '<polygon points="640,0 1123,0 1123,333 900,333" fill="' + navy + '"/>' +
      '<polygon points="640,0 700,0 960,333 900,333" fill="' + navyLight + '"/>' +
      '<polygon points="0,572 200,572 427,794 0,794" fill="' + navy + '"/>' +
      '<polygon points="152,572 200,572 427,794 379,794" fill="' + navyLight + '"/>' +

      /* gold accents following the diagonals */
      '<path d="M600 0 L860 333" stroke="url(#gold)" stroke-width="3" fill="none"/>' +
      '<path d="M427 794 L240 663" stroke="url(#gold)" stroke-width="3" fill="none"/>' +

      /* rounded gold corner hooks (top left and bottom right, as on the club template) */
      '<path d="M109 180 V109 Q109 83 135 83 H277" fill="none" stroke="url(#gold2)" stroke-width="11" stroke-linecap="round"/>' +
      '<path d="M1014 614 V685 Q1014 711 988 711 H846" fill="none" stroke="url(#gold2)" stroke-width="11" stroke-linecap="round"/>' +

      /* gold double rule frame */
      '<rect x="88" y="67" width="947" height="660" fill="none" stroke="url(#gold)" stroke-width="2.6"/>' +
      '<rect x="96" y="75" width="931" height="644" fill="none" stroke="url(#gold)" stroke-width="1.2" opacity=".85"/>' +

      /* bracket corners: thicker, slightly extended ends */
      '<g stroke="url(#gold2)" stroke-width="5.4" stroke-linecap="round" fill="none">' +
        '<path d="M88 151 V67 H172"/><path d="M951 67 H1035 V151"/>' +
        '<path d="M88 643 V727 H172"/><path d="M951 727 H1035 V643"/>' +
      '</g>' +
    '</svg>';
  }

  /** Classic cream design — cream paper, ornate scrollwork, centre medallion. */
  function svg() {
    var gold = '#b8933f', goldLight = '#d9c185', navy = '#1b3a8f', cream = '#fdfbf4';

    /* repeated diamond band between the two gold rules */
    function band() {
      var out = [], step = 30, inset = 30, size = 4.6;
      for (var x = 64; x <= W - 64; x += step) {
        out.push('<path d="M' + x + ' ' + (inset - size) + 'l' + size + ' ' + size + 'l-' + size + ' ' + size + 'l-' + size + ' -' + size + 'z"/>');
        out.push('<path d="M' + x + ' ' + (H - inset - size) + 'l' + size + ' ' + size + 'l-' + size + ' ' + size + 'l-' + size + ' -' + size + 'z"/>');
      }
      for (var y = 92; y <= H - 92; y += step) {
        out.push('<path d="M' + (inset - size) + ' ' + y + 'l' + size + ' ' + size + 'l-' + size + ' ' + size + 'l-' + size + ' -' + size + 'z"/>');
        out.push('<path d="M' + (W - inset - size) + ' ' + y + 'l' + size + ' ' + size + 'l-' + size + ' ' + size + 'l-' + size + ' -' + size + 'z"/>');
      }
      return '<g fill="' + gold + '" opacity=".5">' + out.join('') + '</g>';
    }

    /* corner scrollwork, drawn once and mirrored into the four corners */
    var corner =
      '<g id="cert-corner" fill="none" stroke="' + gold + '" stroke-width="2.1" stroke-linecap="round">' +
        '<path d="M4 74c0-40 30-70 70-70"/>' +
        '<path d="M14 92c0-43 35-78 78-78" opacity=".55" stroke-width="1.2"/>' +
        '<path d="M22 70c18-26 42-38 68-38 16 0 26 8 26 20 0 11-8 18-19 18-9 0-15-5-15-13 0-7 5-12 12-12"/>' +
        '<path d="M70 22c26 18 38 42 38 68 0 16-8 26-20 26-11 0-18-8-18-19 0-9 5-15 13-15 7 0 12 5 12 12"/>' +
        '<circle cx="34" cy="34" r="5.4" fill="' + gold + '" stroke="none"/>' +
        '<circle cx="34" cy="34" r="9.6" fill="none" stroke="' + goldLight + '" stroke-width="1"/>' +
        '<path d="M96 12c14 6 24 16 30 30M12 96c6 14 16 24 30 30" stroke-width="1.3" opacity=".7"/>' +
      '</g>';

    /* top and bottom centre ornaments */
    var ornament =
      '<g id="cert-orn" fill="none" stroke="' + gold + '" stroke-width="1.9" stroke-linecap="round">' +
        '<path d="M-72 0c14-20 34-30 58-30M72 0c-14-20-34-30-58-30"/>' +
        '<path d="M-46-9c11-12 24-18 40-18M46-9c-11-12-24-18-40-18" opacity=".6" stroke-width="1.2"/>' +
        '<circle cx="0" cy="0" r="8" fill="' + cream + '"/>' +
        '<circle cx="0" cy="0" r="8" stroke-width="1.7"/>' +
        '<circle cx="0" cy="0" r="2.6" fill="' + gold + '" stroke="none"/>' +
        '<path d="M-14 6-4 12M14 6 4 12" stroke-width="1.3" opacity=".7"/>' +
      '</g>';

    /* faint centre medallion so the paper looks printed, not blank */
    var medallion = [];
    for (var i = 0; i < 30; i++) {
      medallion.push('<ellipse cx="0" cy="0" rx="150" ry="52" transform="rotate(' + (i * 6) + ')" stroke-width=".4"/>');
    }
    for (var r = 3; r < 12; r++) {
      medallion.push('<circle cx="0" cy="0" r="' + (r * 15) + '" stroke-width=".4"/>');
    }

    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none">' +
      '<defs>' +
        '<linearGradient id="paper" x1="0" y1="0" x2="1" y2="1">' +
          '<stop offset="0" stop-color="#fffdf8"/><stop offset=".45" stop-color="#faf5e9"/>' +
          '<stop offset="1" stop-color="#f4ecdb"/>' +
        '</linearGradient>' +
        '<radialGradient id="vig" cx=".5" cy=".42" r=".78">' +
          '<stop offset=".45" stop-color="#ffffff" stop-opacity=".85"/>' +
          '<stop offset="1" stop-color="#e8dcc2" stop-opacity=".55"/>' +
        '</radialGradient>' +
        '<pattern id="damask" width="34" height="34" patternUnits="userSpaceOnUse">' +
          '<path d="M17 4c5 4 8 8 8 13 0 5-3 9-8 9s-8-4-8-9c0-5 3-9 8-13z" fill="none" stroke="' + gold + '" stroke-width=".5" opacity=".5"/>' +
          '<circle cx="17" cy="17" r="1.5" fill="' + gold + '" opacity=".45"/>' +
          '<path d="M0 17h5M29 17h5M17 0v4M17 30v4" stroke="' + gold + '" stroke-width=".4" opacity=".35"/>' +
        '</pattern>' +
        corner +
        ornament +
        '<g id="cert-medallion" fill="none" stroke="' + navy + '" stroke-width=".5">' + medallion.join('') + '</g>' +
      '</defs>' +

      /* paper */
      '<rect width="' + W + '" height="' + H + '" fill="url(#paper)"/>' +
      '<rect width="' + W + '" height="' + H + '" fill="url(#damask)"/>' +
      '<rect width="' + W + '" height="' + H + '" fill="url(#vig)"/>' +

      /* centre medallion */
      '<g transform="translate(' + (W / 2) + ' ' + (H / 2 + 6) + ')" opacity=".032"><use href="#cert-medallion"/></g>' +

      /* frame */
      '<rect x="26" y="26" width="' + (W - 52) + '" height="' + (H - 52) + '" fill="none" stroke="' + gold + '" stroke-width="3.4"/>' +
      '<rect x="34" y="34" width="' + (W - 68) + '" height="' + (H - 68) + '" fill="none" stroke="' + goldLight + '" stroke-width="1.1"/>' +
      '<rect x="46" y="46" width="' + (W - 92) + '" height="' + (H - 92) + '" fill="none" stroke="' + navy + '" stroke-width=".9" opacity=".42"/>' +
      band() +

      /* corner scrollwork */
      '<use href="#cert-corner" transform="translate(40 40) scale(.8)" opacity=".92"/>' +
      '<use href="#cert-corner" transform="translate(' + (W - 40) + ' 40) scale(-.8 .8)" opacity=".92"/>' +
      '<use href="#cert-corner" transform="translate(40 ' + (H - 40) + ') scale(.8 -.8)" opacity=".92"/>' +
      '<use href="#cert-corner" transform="translate(' + (W - 40) + ' ' + (H - 40) + ') scale(-.8 -.8)" opacity=".92"/>' +

      /* top and bottom ornaments */
      '<g transform="translate(' + (W / 2) + ' 46)"><use href="#cert-orn"/></g>' +
      '<g transform="translate(' + (W / 2) + ' ' + (H - 46) + ')"><use href="#cert-orn" transform="scale(1 -1)"/></g>' +
    '</svg>';
  }

  var cachedURI = null, cachedTemplateURI = null;
  function dataURI() {
    if (!cachedURI) cachedURI = 'data:image/svg+xml;utf8,' + encodeURIComponent(svg());
    return cachedURI;
  }
  function templateURI() {
    if (!cachedTemplateURI) cachedTemplateURI = 'data:image/svg+xml;utf8,' + encodeURIComponent(templateSVG());
    return cachedTemplateURI;
  }
  /** Which built-in design is active: 'template' (default) or 'classic'. */
  function design() {
    var m = settings().certificateBgMode;
    if (m === 'custom') return 'custom';
    if (m === 'classic') return 'classic';
    return 'template';
  }

  /* ══ Club-supplied background ══════════════════════════════════════════ */
  function settings() { return (Store.settings && Store.settings()) || {}; }

  /** Loads settings.certificateBgFileId into the cache (idempotent). */
  function loadCustom(cb) {
    var id = settings().certificateBgFileId;
    if (!id) { custom = null; if (cb) cb(null); return; }
    if (custom && custom.fileId === id) { if (cb) cb(custom); return; }
    if (loading === id) return;
    loading = id;
    try {
      Store.files.get(id).then(function (rec) {
        loading = null;
        if (rec && rec.dataUrl) {
          custom = { fileId: id, dataUrl: rec.dataUrl, name: rec.name };
          refreshLayers();
        } else {
          custom = null;
        }
        if (cb) cb(custom);
      })['catch'](function () { loading = null; custom = null; if (cb) cb(null); });
    } catch (e) { loading = null; custom = null; if (cb) cb(null); }
  }

  /** True when a club image is configured and available. */
  function useCustom() {
    return !!(settings().certificateBgFileId && custom && custom.fileId === settings().certificateBgFileId);
  }

  /** Updates any rendered background layer once the image has loaded. */
  function refreshLayers() {
    if (!document.querySelectorAll) return;
    var nodes = document.querySelectorAll('[data-cert-bg="layer"]');
    Array.prototype.forEach.call(nodes, function (node) {
      if (!useCustom()) {
        node.className = 'cert-bg-layer cert-bg-' + design();
        node.removeAttribute('style');
        var scrim = node.parentNode && node.parentNode.querySelector('[data-cert-bg="scrim"]');
        if (scrim) scrim.remove();
      } else {
        node.className = 'cert-bg-layer custom';
        node.setAttribute('style', 'background-image:url(' + custom.dataUrl + ')');
        if (!node.parentNode.querySelector('[data-cert-bg="scrim"]')) {
          var s = document.createElement('div');
          s.className = 'cert-scrim';
          s.setAttribute('data-cert-bg', 'scrim');
          node.parentNode.insertBefore(s, node.nextSibling);
        }
      }
    });
  }

  /* ══ Markup + CSS ══════════════════════════════════════════════════════ */
  /** Background layers for the certificate (artwork + readability scrim). */
  function layerHTML() {
    var mode = design();
    if (mode === 'custom') {
      loadCustom();
      if (useCustom()) {
        return '<div class="cert-bg-layer custom" data-cert-bg="layer" style="background-image:url(' + custom.dataUrl + ')"></div>' +
          '<div class="cert-scrim" data-cert-bg="scrim"></div>';
      }
      /* still loading — show the club template until the image resolves */
      return '<div class="cert-bg-layer cert-bg-template" data-cert-bg="layer"></div><div class="cert-scrim" data-cert-bg="scrim"></div>';
    }
    return '<div class="cert-bg-layer cert-bg-' + mode + '" data-cert-bg="layer"></div>';
  }

  function hasBackground() { return true; }

  function cssRules() {
    return [
      '.cert-bg-layer{position:absolute;inset:0;z-index:0;background-repeat:no-repeat;background-position:center center;background-size:100% 100%;pointer-events:none}',
      '.cert-bg-layer.custom{background-size:cover}',
      '.cert-scrim{position:absolute;inset:0;z-index:0;background:rgba(255,253,247,.75);pointer-events:none}',
      '.cert-bg-template{background-image:url("' + templateURI() + '")}',
      '.cert-bg-classic{background-image:url("' + dataURI() + '")}',
      '.cert-preview.has-bg::before,.cert-preview.has-bg::after{display:none}',
      '.cert-preview.has-bg{padding:9% 10.4% 9.6%;aspect-ratio:297/210;display:flex;flex-direction:column;justify-content:center;background:#fff}',
      '.cert-preview.has-bg .cert-frame-deco{display:none}',
      '@media (max-width:900px){.cert-preview.has-bg{padding:7.5% 8%}' +
        '.cert-preview.has-bg .cert-crest{width:52px;height:52px}.cert-preview.has-bg .cert-title{font-size:1.6rem}' +
        '.cert-preview.has-bg .cert-name{font-size:1.35rem}}' +
      /* Phones keep the A4 landscape ratio: the frame never turns portrait, the
         text inside simply scales down so everything still fits. */
      '@media (max-width:640px){.cert-preview.has-bg{padding:6% 6.5%;aspect-ratio:297/210}' +
        '.cert-preview.has-bg .cert-crest{width:40px;height:40px;margin-bottom:6px}' +
        '.cert-preview.has-bg .cert-crest svg{width:22px;height:22px}' +
        '.cert-preview.has-bg .cert-org{font-size:.5rem;letter-spacing:.2em}' +
        '.cert-preview.has-bg .cert-school{font-size:.6rem}' +
        '.cert-preview.has-bg .cert-title{font-size:1.05rem;margin:5px 0 1px}' +
        '.cert-preview.has-bg .cert-type{font-size:.6rem}' +
        '.cert-preview.has-bg .cert-lead{font-size:.6rem;margin-top:7px}' +
        '.cert-preview.has-bg .cert-name{font-size:1rem;padding-bottom:5px;min-width:70%}' +
        '.cert-preview.has-bg .cert-body{font-size:.6rem;margin-top:8px;line-height:1.5}' +
        '.cert-preview.has-bg .cert-meta{margin-top:16px;gap:12px}' +
        '.cert-preview.has-bg .cert-seal{width:44px;height:44px;font-size:.4rem;border-width:2px}' +
        '.cert-preview.has-bg .cert-sign strong{font-size:.6rem}.cert-preview.has-bg .cert-sign span{font-size:.56rem}' +
        '.cert-preview.has-bg .cert-no{font-size:.56rem;margin-top:8px}}'
    ].join('\n');
  }

  /* ══ Settings helpers ══════════════════════════════════════════════════ */
  /** Stores an uploaded background and switches certificates to it. */
  function setCustomFile(file) {
    if (!file) return Promise.resolve(false);
    if (!/^image\//.test(file.type || '')) {
      UI.toast('Unsupported file', 'Choose a PNG or JPEG image for the certificate background.', 'warning');
      return Promise.resolve(false);
    }
    if (file.size > 4 * 1024 * 1024) {
      UI.toast('Image too large', 'Choose an image smaller than 4 MB so printed certificates stay sharp and light.', 'warning');
      return Promise.resolve(false);
    }
    return U.readFileAsDataURL(file).then(function (dataUrl) {
      return Store.files.put(file.name, file.type, dataUrl).then(function (id) {
        var old = settings().certificateBgFileId;
        Store.saveSettings({ certificateBgFileId: id, certificateBgMode: 'custom' });
        if (old && old !== id) { try { Store.files.remove(old); } catch (e) {} }
        custom = { fileId: id, dataUrl: dataUrl, name: file.name };
        return true;
      });
    });
  }

  function clearCustom() {
    var old = settings().certificateBgFileId;
    Store.saveSettings({ certificateBgFileId: null, certificateBgMode: 'template' });
    if (old) { try { Store.files.remove(old); } catch (e) {} }
    custom = null;
  }

  /** Small data URI of a built-in design for the settings preview tiles. */
  function thumbURI(which) { return which === 'classic' ? dataURI() : templateURI(); }

  /** Switches to a built-in design ('template' | 'classic'). */
  function useBuiltin(which) {
    Store.saveSettings({ certificateBgMode: which === 'classic' ? 'classic' : 'template' });
    refreshLayers();
  }

  global.CertBG = {
    svg: svg, dataURI: dataURI, templateSVG: templateSVG, templateURI: templateURI,
    thumbURI: thumbURI, cssRules: cssRules, design: design, useBuiltin: useBuiltin,
    layerHTML: layerHTML, hasBackground: hasBackground,
    useCustom: useCustom, loadCustom: loadCustom, refreshLayers: refreshLayers,
    setCustomFile: setCustomFile, clearCustom: clearCustom,
    current: function () { return custom; }
  };
})(window);
