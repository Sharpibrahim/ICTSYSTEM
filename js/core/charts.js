/* ==========================================================================
   MRHS ICT CLUB MASTER — js/core/charts.js
   Zero-dependency SVG charts: line/area, bar (grouped & stacked), donut,
   horizontal bars, sparklines and heat calendars. Every chart is responsive,
   theme-aware and exposes an accessible table fallback via `data-table`.
   ========================================================================== */
(function (global) {
  'use strict';

  var U = Utils;
  var uidn = 0;

  var DEFAULT_COLORS = ['#1d3f70', '#2f6ea8', '#4a90c2', '#3d5a80', '#2c6b45', '#8a6412', '#66748a', '#16325a', '#a1442c', '#4f74a6'];

  function esc(s) { return String(s === undefined || s === null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;'); }
  function tipAttr(html) { return ' data-chart-tip="' + String(html).replace(/&/g, '&amp;').replace(/"/g, '&quot;') + '"'; }
  function color(i, custom) { return custom || DEFAULT_COLORS[i % DEFAULT_COLORS.length]; }
  function niceMax(v) {
    if (v <= 0) return 4;
    var mag = Math.pow(10, Math.floor(Math.log10(v)));
    var norm = v / mag;
    var step = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10;
    return step * mag;
  }
  function fmtAxis(v, format) {
    if (format) return format(v);
    if (Math.abs(v) >= 1e6) return (v / 1e6) + 'M';
    if (Math.abs(v) >= 1000) return (v / 1000) + 'k';
    return String(Math.round(v * 100) / 100);
  }

  /* ══ Line / area chart ═════════════════════════════════════════════════ */
  function line(o) {
    o = o || {};
    var series = (o.series || []).map(function (s, i) {
      return { name: s.name || ('Series ' + (i + 1)), color: color(i, s.color), data: (s.data || []).map(Number), dashed: s.dashed };
    });
    var labels = o.labels || [];
    if (!series.length || !series[0].data.length) return '<div class="chart-empty">No data available for this chart yet.</div>';

    var W = 780, H = o.height || 260, P = { t: 16, r: 18, b: 34, l: 46 };
    var all = series.reduce(function (a, s) { return a.concat(s.data); }, []);
    var maxV = Math.max.apply(null, all) || 1;
    var minV = o.minZero === false ? Math.min.apply(null, all) : 0;
    var top = niceMax(maxV * 1.08);
    var n = series[0].data.length;
    var iw = W - P.l - P.r, ih = H - P.t - P.b;
    var xAt = function (i) { return P.l + (n === 1 ? iw / 2 : (iw * i) / (n - 1)); };
    var yAt = function (v) { return P.t + ih - ((v - minV) / (top - minV || 1)) * ih; };
    var gid = 'cg' + (++uidn);

    var grid = '', ticks = 5;
    for (var t = 0; t <= ticks; t++) {
      var v = minV + ((top - minV) * t) / ticks;
      var y = yAt(v);
      grid += '<line x1="' + P.l + '" x2="' + (W - P.r) + '" y1="' + y.toFixed(1) + '" y2="' + y.toFixed(1) + '" stroke="var(--chart-grid)" stroke-width="1"/>' +
        '<text x="' + (P.l - 8) + '" y="' + (y + 4).toFixed(1) + '" text-anchor="end" font-size="11" fill="var(--text-3)">' + esc(fmtAxis(v, o.yFormat)) + '</text>';
    }
    var xLabels = '';
    var step = Math.max(1, Math.ceil(n / (o.maxLabels || 9)));
    for (var i = 0; i < n; i++) {
      if (i % step !== 0 && i !== n - 1) continue;
      xLabels += '<text x="' + xAt(i).toFixed(1) + '" y="' + (H - P.b + 20) + '" text-anchor="middle" font-size="11" fill="var(--text-3)">' + esc(labels[i] === undefined ? i + 1 : labels[i]) + '</text>';
    }

    var paths = '', dots = '';
    series.forEach(function (s, si) {
      var d = s.data.map(function (v, i) { return (i ? 'L' : 'M') + xAt(i).toFixed(1) + ' ' + yAt(v).toFixed(1); }).join(' ');
      if (o.area !== false && si === 0) {
        paths += '<defs><linearGradient id="' + gid + si + '" x1="0" y1="0" x2="0" y2="1">' +
          '<stop offset="0%" stop-color="' + s.color + '" stop-opacity="0.32"/>' +
          '<stop offset="100%" stop-color="' + s.color + '" stop-opacity="0.02"/></linearGradient></defs>' +
          '<path d="' + d + ' L ' + xAt(n - 1).toFixed(1) + ' ' + yAt(minV).toFixed(1) + ' L ' + xAt(0).toFixed(1) + ' ' + yAt(minV).toFixed(1) + ' Z" fill="url(#' + gid + si + ')"/>';
      }
      paths += '<path d="' + d + '" fill="none" stroke="' + s.color + '" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"' +
        (s.dashed ? ' stroke-dasharray="6 5"' : '') + '/>';
      s.data.forEach(function (v, i) {
        var tip = '<strong>' + esc(labels[i] === undefined ? 'Point ' + (i + 1) : labels[i]) + '</strong>' +
          '<div class="ct-row"><span class="ct-swatch" style="background:' + s.color + '"></span><span>' + esc(s.name) + '</span><span><b>' + esc(o.valueFormat ? o.valueFormat(v) : U.num(v)) + '</b></span></div>';
        dots += '<circle cx="' + xAt(i).toFixed(1) + '" cy="' + yAt(v).toFixed(1) + '" r="4" fill="var(--surface)" stroke="' + s.color + '" stroke-width="2.2" class="chart-dot"' +
          tipAttr(tip) + ' tabindex="0" role="img" aria-label="' + esc(s.name + ': ' + v) + '"/>';
      });
    });

    return '<div class="chart-wrap">' +
      '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(o.aria || 'Line chart') + '" preserveAspectRatio="xMidYMid meet">' +
      grid + xLabels + paths + dots + '</svg></div>' +
      legend(series, o) + axisTable(labels, series, o);
  }

  function legend(series, o) {
    if (o.legend === false) return '';
    return '<div class="chart-legend">' + series.map(function (s, i) {
      return '<span class="cl-item"><span class="cl-swatch" style="background:' + s.color + '"></span>' + esc(s.name) +
        (o.legendTotals ? '<span class="cl-value">' + U.num(U.sum(s.data)) + '</span>' : '') + '</span>';
    }).join('') + '</div>';
  }

  /** Screen-reader / print friendly data table behind each chart. */
  function axisTable(labels, series, o) {
    if (o.table === false) return '';
    var id = 'ct' + (++uidn);
    return '<details class="chart-table sr-only"><summary>Chart data table</summary><table class="stat-table"><thead><tr><th scope="col">' +
      (o.xLabel || 'Period') + '</th>' + series.map(function (s) { return '<th scope="col">' + esc(s.name) + '</th>'; }).join('') +
      '</tr></thead><tbody>' + labels.map(function (l, i) {
        return '<tr><th scope="row">' + esc(l) + '</th>' + series.map(function (s) {
          return '<td class="num">' + esc(s.data[i] === undefined ? '' : s.data[i]) + '</td>';
        }).join('') + '</tr>';
      }).join('') + '</tbody></table></details>';
  }

  /* ══ Bar chart ═════════════════════════════════════════════════════════ */
  function bar(o) {
    o = o || {};
    var cats = o.categories || [];
    var series = (o.series || []).map(function (s, i) {
      return { name: s.name || ('Series ' + (i + 1)), color: color(i, s.color !== undefined ? s.color : (o.colors ? o.colors[i] : null)), data: (s.data || []).map(Number) };
    });
    if (!cats.length || !series.length) return '<div class="chart-empty">No data available for this chart yet.</div>';

    var W = 780, H = o.height || 260, P = { t: 16, r: 18, b: 40, l: 48 };
    var stacked = !!o.stacked;
    var totals = cats.map(function (_, ci) { return series.reduce(function (a, s) { return a + (s.data[ci] || 0); }, 0); });
    var maxV = stacked ? Math.max.apply(null, totals) : Math.max.apply(null, series.reduce(function (a, s) { return a.concat(s.data); }, [0]));
    var top = niceMax(maxV * 1.1) || 4;
    var iw = W - P.l - P.r, ih = H - P.t - P.b;
    var bandW = iw / cats.length;
    var barGroupW = bandW * (o.barWidth || 0.62);
    var barW = stacked ? barGroupW : barGroupW / series.length;

    var grid = '';
    for (var t = 0; t <= 5; t++) {
      var v = (top * t) / 5, y = P.t + ih - (v / top) * ih;
      grid += '<line x1="' + P.l + '" x2="' + (W - P.r) + '" y1="' + y.toFixed(1) + '" y2="' + y.toFixed(1) + '" stroke="var(--chart-grid)"/>' +
        '<text x="' + (P.l - 8) + '" y="' + (y + 4).toFixed(1) + '" text-anchor="end" font-size="11" fill="var(--text-3)">' + esc(fmtAxis(v, o.yFormat)) + '</text>';
    }

    var bars = '', xLabels = '';
    cats.forEach(function (cat, ci) {
      var x0 = P.l + bandW * ci + (bandW - barGroupW) / 2;
      var acc = 0;
      xLabels += '<text x="' + (P.l + bandW * ci + bandW / 2).toFixed(1) + '" y="' + (H - P.b + 20) + '" text-anchor="middle" font-size="11" fill="var(--text-3)">' + esc(cat) + '</text>';
      series.forEach(function (s, si) {
        var v = s.data[ci] || 0;
        var h = (v / top) * ih;
        var x = stacked ? x0 : x0 + barW * si;
        var y = stacked ? (P.t + ih - acc - h) : (P.t + ih - h);
        acc += h;
        var tip = '<strong>' + esc(cat) + '</strong><div class="ct-row"><span class="ct-swatch" style="background:' + s.color + '"></span><span>' + esc(s.name) + '</span><span><b>' + esc(o.valueFormat ? o.valueFormat(v) : U.num(v)) + '</b></span></div>';
        bars += '<rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + Math.max(1, barW - 2).toFixed(1) + '" height="' + Math.max(0, h).toFixed(1) +
          '" rx="' + (o.rounded === false ? 0 : Math.min(5, barW / 2.4)).toFixed(1) + '" fill="' + s.color + '"' + tipAttr(tip) +
          ' class="chart-bar" tabindex="0" role="img" aria-label="' + esc(cat + ', ' + s.name + ': ' + v) + '"/>';
      });
    });

    return '<div class="chart-wrap"><svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(o.aria || 'Bar chart') + '">' +
      grid + bars + xLabels + '</svg></div>' + legend(series, o) + axisTable(cats, series, o);
  }

  /* ══ Donut ═════════════════════════════════════════════════════════════ */
  function donut(o) {
    o = o || {};
    var data = (o.data || []).filter(function (d) { return Number(d.value) > 0; });
    if (!data.length) return '<div class="chart-empty">No data available for this chart yet.</div>';
    var total = U.sum(data, function (d) { return d.value; });
    var size = o.size || 220, stroke = o.stroke || 26;
    var r = (size - stroke) / 2, c = 2 * Math.PI * r, offset = 0;
    var arcs = data.map(function (d, i) {
      var frac = Number(d.value) / total;
      var len = frac * c;
      var col = d.color || color(i, o.colors ? o.colors[i] : null);
      var tip = '<strong>' + esc(d.label) + '</strong><div class="ct-row"><span class="ct-swatch" style="background:' + col + '"></span><span>' + U.num(d.value) + ' · ' + Math.round(frac * 100) + '%</span></div>';
      var seg = '<circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" fill="none" stroke="' + col + '" stroke-width="' + stroke +
        '" stroke-dasharray="' + len.toFixed(2) + ' ' + (c - len).toFixed(2) + '" stroke-dashoffset="' + (-offset).toFixed(2) +
        '" transform="rotate(-90 ' + size / 2 + ' ' + size / 2 + ')"' + tipAttr(tip) + ' class="chart-arc" tabindex="0" role="img" aria-label="' + esc(d.label + ': ' + d.value) + '"/>';
      offset += len;
      return seg;
    }).join('');

    return '<div class="chart-wrap" style="display:grid;grid-template-columns:auto 1fr;gap:22px;align-items:center">' +
      '<div style="position:relative;width:' + size + 'px;max-width:100%">' +
        '<svg viewBox="0 0 ' + size + ' ' + size + '" role="img" aria-label="' + esc(o.aria || 'Donut chart') + '" style="width:100%;height:auto">' +
          '<circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" fill="none" stroke="var(--surface-3)" stroke-width="' + stroke + '"/>' + arcs +
        '</svg>' +
        '<div class="donut-center" style="inset:0">' +
          '<div><strong>' + esc(o.centerValue !== undefined ? o.centerValue : U.num(total)) + '</strong><span>' + esc(o.centerLabel || 'Total') + '</span></div>' +
        '</div>' +
      '</div>' +
      '<div class="chart-legend" style="flex-direction:column;align-items:flex-start;gap:9px;margin:0">' +
        data.map(function (d, i) {
          var col = d.color || color(i, o.colors ? o.colors[i] : null);
          return '<span class="cl-item"><span class="cl-swatch" style="background:' + col + '"></span>' + esc(d.label) +
            '<span class="cl-value">' + U.num(d.value) + (o.showPercent === false ? '' : ' (' + Math.round((d.value / total) * 100) + '%)') + '</span></span>';
        }).join('') +
      '</div></div>';
  }

  /* ══ Horizontal bars (rankings) ════════════════════════════════════════ */
  function hbar(o) {
    o = o || {};
    var data = (o.data || []).filter(function (d) { return d.value !== undefined; });
    if (!data.length) return '<div class="chart-empty">No data available for this chart yet.</div>';
    var max = o.max || Math.max.apply(null, data.map(function (d) { return Number(d.value) || 0; })) || 1;
    return '<div style="display:grid;gap:11px">' + data.map(function (d, i) {
      var pct = (Number(d.value) / max) * 100;
      var col = d.color || color(i, null);
      return '<div class="progress-row">' +
        '<div class="pr-head"><strong>' + esc(d.label) + '</strong><span>' + esc(o.valueFormat ? o.valueFormat(d.value) : U.num(d.value)) + '</span></div>' +
        '<div class="progress"><i style="width:' + Math.max(1.5, pct).toFixed(1) + '%;background:' + col + '"></i></div>' +
      '</div>';
    }).join('') + '</div>';
  }

  /* ══ Sparkline ═════════════════════════════════════════════════════════ */
  function sparkline(data, o) {
    o = o || {};
    var vals = (data || []).map(Number);
    if (vals.length < 2) return '';
    var W = o.width || 108, H = o.height || 34;
    var max = Math.max.apply(null, vals), min = Math.min.apply(null, vals);
    var span = (max - min) || 1;
    var pts = vals.map(function (v, i) {
      return [((W - 4) * i) / (vals.length - 1) + 2, H - 3 - ((v - min) / span) * (H - 8)];
    });
    var d = pts.map(function (p, i) { return (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join(' ');
    var col = o.color || '#1d3f70';
    var last = pts[pts.length - 1];
    return '<svg class="sparkline" width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '" aria-hidden="true">' +
      '<path d="' + d + ' L ' + W + ' ' + H + ' L 0 ' + H + ' Z" fill="' + col + '" opacity="0.12"/>' +
      '<path d="' + d + '" fill="none" stroke="' + col + '" stroke-width="2" stroke-linejoin="round"/>' +
      '<circle cx="' + last[0].toFixed(1) + '" cy="' + last[1].toFixed(1) + '" r="2.6" fill="' + col + '"/></svg>';
  }

  /* ══ Heat calendar ════════════════════════════════════════════════════ */
  function heatmap(o) {
    o = o || {};
    var cells = o.cells || [];      // [{date, value}]
    var weeks = o.weeks || 18;
    if (!cells.length) return '<div class="chart-empty">No activity recorded yet.</div>';
    var byDate = {};
    cells.forEach(function (c) { byDate[c.date] = c.value; });
    var max = Math.max.apply(null, cells.map(function (c) { return c.value; })) || 1;
    var end = U.toDate(o.end || new Date());
    var start = U.addDays(end, -(weeks * 7 - 1));
    start = U.startOfWeek(start);
    var cols = [], col = [], d = new Date(start.getTime());
    var guard = 0;
    while (d <= end && guard < 400) {
      var iso = U.iso(d);
      var v = byDate[iso] || 0;
      var level = v === 0 ? 0 : Math.ceil((v / max) * 4);
      var tip = '<strong>' + U.fmtDate(iso) + '</strong><div class="ct-row"><span>' + U.num(v) + ' ' + U.plural(v, 'record') + '</span></div>';
      col.push('<span class="heat-cell" style="background:' + (v === 0 ? 'var(--surface-3)' : 'rgba(37,69,214,' + (0.18 + level * 0.2) + ')') + '"' + tipAttr(tip) + '></span>');
      d.setDate(d.getDate() + 1); guard++;
      if (col.length === 7) { cols.push('<div style="display:grid;gap:3px">' + col.join('') + '</div>'); col = []; }
    }
    if (col.length) cols.push('<div style="display:grid;gap:3px">' + col.join('') + '</div>');
    return '<div style="overflow-x:auto"><div style="display:flex;gap:3px">' + cols.join('') + '</div></div>' +
      '<div class="heat-legend"><span>Less</span>' +
      [0, 1, 2, 3, 4].map(function (l) { return '<span class="heat-cell" style="background:' + (l === 0 ? 'var(--surface-3)' : 'rgba(37,69,214,' + (0.18 + l * 0.2) + ')') + '"></span>'; }).join('') +
      '<span>More</span><span class="muted" style="margin-left:auto">' + U.fmtDate(start) + ' — ' + U.fmtDate(end) + '</span></div>';
  }

  /* ══ Chart tooltip binding ════════════════════════════════════════════ */
  function bind() {
    var tip = null;
    function ensure() {
      if (!tip) { tip = U.el('<div class="chart-tooltip"></div>'); document.body.appendChild(tip); }
      return tip;
    }
    function hide() { if (tip) tip.style.display = 'none'; }
    function show(html, x, y) {
      var t = ensure();
      t.innerHTML = html;
      t.style.display = 'block';
      var r = t.getBoundingClientRect();
      var left = Math.min(Math.max(8, x - r.width / 2), window.innerWidth - r.width - 8);
      var top = y - r.height - 12;
      if (top < 8) top = y + 16;
      t.style.left = left + 'px';
      t.style.top = top + 'px';
    }
    document.addEventListener('mousemove', function (e) {
      var host = e.target.closest && e.target.closest('[data-chart-tip]');
      if (!host) { hide(); return; }
      show(host.getAttribute('data-chart-tip'), e.clientX, e.clientY);
    });
    document.addEventListener('mouseout', function (e) {
      if (e.target.closest && e.target.closest('[data-chart-tip]')) hide();
    });
    document.addEventListener('focusin', function (e) {
      var host = e.target.closest && e.target.closest('[data-chart-tip]');
      if (!host) return;
      var r = host.getBoundingClientRect();
      show(host.getAttribute('data-chart-tip'), r.left + r.width / 2, r.top);
    });
    document.addEventListener('focusout', hide);
    document.addEventListener('scroll', hide, true);
  }

  global.Charts = {
    line: line, bar: bar, donut: donut, hbar: hbar, sparkline: sparkline, heatmap: heatmap,
    bind: bind, colors: DEFAULT_COLORS, niceMax: niceMax
  };
})(window);
