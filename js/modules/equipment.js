/* ==========================================================================
   MRHS ICT CLUB MASTER — js/modules/equipment.js
   Club inventory: computers, laptops, projectors, routers, cameras, cables
   and electronics with condition, location, assignment and maintenance.
   ========================================================================== */
(function (global) {
  'use strict';

  var U = Utils;
  var view = 'table';

  function nameOf(id) {
    if (!id) return '—';
    var m = Store.find('members', id);
    if (m) return m.fullName;
    var u = Store.find('users', id);
    if (u) return u.name;
    return id;
  }
  function totalValue(e) { return (Number(e.quantity) || 0) * (Number(e.unitCost) || 0); }
  function categoryIcon(cat) {
    return {
      'Computers': 'monitor', 'Laptops': 'laptop', 'Projectors': 'projector', 'Routers': 'wifi',
      'Cameras': 'camera', 'Cables': 'cable', 'Flash Drives': 'hard-drive', 'Electronics': 'cpu'
    }[cat] || 'package';
  }
  function statusOf(e) {
    if (e.status) return e.status;
    if (e.condition === 'Damaged') return 'Damaged';
    if (e.condition === 'Under Repair') return 'Under Repair';
    return e.condition || 'Good';
  }

  /* Maintenance log helpers — kept in the record so nothing is lost. */
  function openMaintenance(e, onDone) {
    if (!CRUD.guard('equipment', 'edit')) return;
    var log = (e.maintenance || []).slice();
    UI.formModal({
      title: 'Log maintenance', subtitle: e.name + ' · ' + e.assetId, icon: 'wrench', size: 'sm',
      formHtml: Forms.render([
        { name: 'date', label: 'Date', type: 'date', required: true, value: U.todayISO() },
        { name: 'condition', label: 'Condition after service', type: 'select', options: Data.EQUIPMENT_CONDITIONS, value: e.condition, required: true },
        { name: 'status', label: 'Status', type: 'select', options: ['In Use', 'In Store', 'Under Repair', 'Damaged', 'Retired'], value: statusOf(e), required: true },
        { name: 'cost', label: 'Cost (' + (Store.settings().currency || 'UGX') + ')', type: 'number', min: 0, step: 1000, value: 0 },
        { name: 'by', label: 'Handled by', type: 'text', value: 'ICT/Technical Director' },
        { name: 'note', label: 'What was done?', type: 'textarea', colSpan: 2, rows: 3, required: true }
      ]),
      submitLabel: 'Save maintenance record',
      onOpen: function (c, form) { Forms.init(form); },
      onSubmit: function (data) {
        log.push({ date: data.date, note: data.note, cost: Number(data.cost) || 0, by: data.by, condition: data.condition });
        Store.update('equipment', e.id, { maintenance: log, condition: data.condition, status: data.status, lastServiced: data.date });
        UI.toast('Maintenance logged', e.name + ' was updated and the service history recorded.', 'success');
        if (onDone) onDone(); else Router.refresh();
      }
    });
  }

  var config = {
    key: 'equipment',
    title: 'Equipment',
    singular: 'item',
    icon: 'package',
    module: 'equipment',
    collection: 'equipment',
    subtitle: 'Inventory of club ICT equipment with condition, location and maintenance history.',
    stats: function () {
      var e = Metrics.equipment();
      return [
        { label: 'Inventory lines', value: U.num(e.total), icon: 'package', tone: 'primary', foot: e.items + ' individual items' },
        { label: 'Estimated value', value: U.shortMoney(e.value), icon: 'coins', tone: 'secondary', foot: 'Based on recorded unit cost' },
        { label: 'Good condition', value: U.num(Store.count('equipment', function (x) { return x.condition === 'Good' || x.condition === 'New'; })), icon: 'check-circle', tone: 'success', foot: 'Ready for use' },
        { label: 'Needs attention', value: U.num(e.damaged), icon: 'wrench', tone: e.damaged ? 'warning' : 'neutral', foot: 'Damaged or under repair' }
      ];
    },
    toolbarExtra: function () {
      return '<span data-eq-view>' + UI.segmented([
        { key: 'table', label: 'Table', icon: 'list' },
        { key: 'cards', label: 'Cards', icon: 'grid' }
      ], view) + '</span>';
    },
    schema: function (values) {
      return [
        { name: 'name', label: 'Item name', type: 'text', required: true, colSpan: 2, value: values.name, placeholder: 'e.g. Dell OptiPlex Desktop Computer' },
        { name: 'category', label: 'Category', type: 'select', required: true, options: Data.EQUIPMENT_CATEGORIES, value: values.category || 'Computers' },
        { name: 'quantity', label: 'Quantity', type: 'number', required: true, min: 1, max: 500, value: values.quantity || 1 },
        { name: 'condition', label: 'Condition', type: 'select', required: true, options: Data.EQUIPMENT_CONDITIONS, value: values.condition || 'Good' },
        { name: 'status', label: 'Status', type: 'select', required: true, options: ['In Use', 'In Store', 'Under Repair', 'Damaged', 'Retired'], value: values.status || 'In Use' },
        { name: 'location', label: 'Location', type: 'text', required: true, value: values.location, placeholder: 'e.g. ICT Laboratory 1' },
        { name: 'assignedTo', label: 'Assigned to', type: 'text', value: values.assignedTo, placeholder: 'Position or person responsible' },
        { name: 'purchaseDate', label: 'Purchase date', type: 'date', value: values.purchaseDate || U.todayISO() },
        { name: 'unitCost', label: 'Unit cost (' + (Store.settings().currency || 'UGX') + ')', type: 'number', min: 0, step: 1000, value: values.unitCost || 0 },
        { name: 'supplier', label: 'Supplier', type: 'text', value: values.supplier },
        { name: 'warranty', label: 'Warranty', type: 'text', value: values.warranty, placeholder: 'e.g. 12 months' },
        { name: 'serial', label: 'Serial / asset tag', type: 'text', value: values.serial },
        { name: 'notes', label: 'Notes', type: 'textarea', colSpan: 2, rows: 3, value: values.notes }
      ];
    },
    transform: function (data, values) {
      return {
        name: data.name, category: data.category, quantity: Number(data.quantity) || 1,
        condition: data.condition, status: data.status, location: data.location,
        assignedTo: data.assignedTo, purchaseDate: data.purchaseDate, unitCost: Number(data.unitCost) || 0,
        supplier: data.supplier, warranty: data.warranty, serial: data.serial, notes: data.notes,
        maintenance: values.maintenance || [], demo: values.demo === true
      };
    },
    afterSave: function (rec) {
      if (!rec.id) return;
      if (!Store.find('equipment', rec.id).assetId) {
        Store.update('equipment', rec.id, { assetId: CRUD.nextCode('equipment', 'assetId', 'MRHS-ICT-EQ-', 4) });
      }
    },
    columns: [
      {
        key: 'name', label: 'Item',
        render: function (e) {
          return '<span class="cell-primary">' + Icons.svg(categoryIcon(e.category), { size: 16 }) + ' ' + U.esc(e.name) + '</span>' +
            '<br><span class="td-muted">' + U.esc(e.assetId || '') + (e.serial ? ' · ' + U.esc(e.serial) : '') + '</span>';
        }
      },
      { key: 'category', label: 'Category', render: function (e) { return UI.badge(e.category, 'secondary'); } },
      { key: 'quantity', label: 'Qty', render: function (e) { return '<strong>' + e.quantity + '</strong>'; } },
      { key: 'condition', label: 'Condition', render: function (e) { return UI.badge(e.condition, U.tone(e.condition === 'New' ? 'success' : e.condition === 'Good' ? 'info' : e.condition === 'Fair' ? 'warning' : 'danger'), { icon: 'activity' }); } },
      { key: 'location', label: 'Location', render: function (e) { return U.esc(e.location) + '<br><span class="td-muted">' + U.esc(nameOf(e.assignedTo)) + '</span>'; } },
      { key: 'unitCost', label: 'Value', render: function (e) { return U.money(totalValue(e), Store.settings().currency); } },
      { key: 'status', label: 'Status', render: function (e) { return UI.statusBadge(statusOf(e)); } }
    ],
    filters: [
      { key: 'category', label: 'All categories', options: Data.EQUIPMENT_CATEGORIES },
      { key: 'condition', label: 'All conditions', options: Data.EQUIPMENT_CONDITIONS },
      { key: 'status', label: 'All statuses', options: ['In Use', 'In Store', 'Under Repair', 'Damaged', 'Retired'] }
    ],
    searchKeys: function (e) { return [e.name, e.assetId, e.serial, e.category, e.location, e.assignedTo, e.supplier, e.notes]; },
    exportColumns: [
      { key: 'assetId', label: 'Asset ID' }, { key: 'name', label: 'Item' }, { key: 'category', label: 'Category' },
      { key: 'quantity', label: 'Quantity' }, { key: 'condition', label: 'Condition' }, { key: 'status', label: 'Status' },
      { key: 'location', label: 'Location' }, { key: 'assignedTo', label: 'Assigned to' },
      { key: 'purchaseDate', label: 'Purchase date' }, { key: 'unitCost', label: 'Unit cost' },
      { value: function (e) { return totalValue(e); }, label: 'Total value' }
    ],
    rowActions: function (e) {
      var out = CRUD.viewBtn('#/equipment/' + e.id, 'item');
      if (Auth.can('equipment', 'edit')) out += CRUD.actionBtn('service', e.id, 'wrench', 'Log maintenance');
      if (Auth.can('equipment', 'edit')) out += CRUD.actionBtn('edit', e.id, 'edit', 'Edit item');
      if (Auth.can('equipment', 'delete')) out += CRUD.actionBtn('delete', e.id, 'trash', 'Delete item', 'danger');
      return out;
    },
    onRowAction: function (action, e, table) {
      if (action === 'service') openMaintenance(e, function () { if (table) table.refresh(); });
    },
    empty: { icon: 'package', title: 'No equipment recorded', message: 'Register club equipment so the cabinet can track its condition and location.' },

    detailTitle: function (e) { return e.name; },
    detailSubtitle: function (e) { return (e.assetId || '') + ' · ' + e.category + ' · ' + e.location; },
    detailBadges: function (e) {
      return UI.statusBadge(statusOf(e)) + UI.badge(e.quantity + ' in stock', 'secondary', { icon: 'package' }) +
        UI.badge(e.condition, U.tone(e.condition === 'New' ? 'success' : e.condition === 'Good' ? 'info' : e.condition === 'Fair' ? 'warning' : 'danger')) +
        (e.demo ? UI.demoChip() : '');
    },
    detailActions: function (e) {
      return (Auth.can('equipment', 'edit') ? '<button type="button" class="btn btn-primary btn-sm" data-detail-action="service">' + Icons.svg('wrench', { class: 'btn-ico' }) + 'Log maintenance</button>' : '') +
        '<button type="button" class="btn btn-outline btn-sm" data-detail-action="label">' + Icons.svg('id-card', { class: 'btn-ico' }) + 'Inventory label</button>';
    },
    detail: function (e) {
      var log = (e.maintenance || []).slice().reverse();
      var overview = UI.card({
        title: 'Asset record', icon: 'package',
        body: UI.kvGrid([
          { label: 'Asset ID', html: '<span class="id-pill">' + U.esc(e.assetId || '—') + '</span>' },
          { label: 'Category', value: e.category },
          { label: 'Quantity', value: e.quantity + ' unit' + (e.quantity === 1 ? '' : 's') },
          { label: 'Condition', value: e.condition },
          { label: 'Status', value: statusOf(e) },
          { label: 'Location', value: e.location },
          { label: 'Assigned to', value: nameOf(e.assignedTo) },
          { label: 'Serial / tag', value: e.serial || '—' },
          { label: 'Purchase date', value: U.fmtDate(e.purchaseDate, 'long') },
          { label: 'Age', value: e.purchaseDate ? U.timeAgo(e.purchaseDate) : '—' },
          { label: 'Unit cost', value: U.money(e.unitCost || 0, Store.settings().currency) },
          { label: 'Total value', html: '<strong>' + U.money(totalValue(e), Store.settings().currency) + '</strong>' },
          { label: 'Supplier', value: e.supplier || '—' },
          { label: 'Warranty', value: e.warranty || '—' },
          { label: 'Last serviced', value: e.lastServiced ? U.fmtDate(e.lastServiced, 'long') : 'No service recorded' }
        ]) +
        (e.notes ? '<div class="note-block mt-2">' + U.esc(e.notes) + '</div>' : '') +
        (Auth.can('equipment', 'edit') ? '<button type="button" class="btn btn-outline btn-sm mt-2" data-detail-action="service">' + Icons.svg('wrench', { class: 'btn-ico' }) + 'Log maintenance visit</button>' : '')
      });

      var history = UI.card({
        title: 'Maintenance history', icon: 'activity', sub: log.length + ' entries',
        body: log.length ? UI.timeline(log.map(function (m) {
          return {
            icon: 'wrench', tone: 'info', title: U.esc(m.note),
            text: 'Condition: ' + U.esc(m.condition) + (m.by ? ' · by ' + U.esc(m.by) : '') + (m.cost ? ' · ' + U.money(m.cost, Store.settings().currency) : ''),
            time: U.fmtDate(m.date, 'long')
          };
        })) : UI.emptyState({ icon: 'wrench', title: 'No maintenance records', message: 'Log a maintenance or repair visit to keep this asset’s history.' })
      });

      var usage = UI.card({
        title: 'Usage summary', icon: 'bar-chart',
        body: (function () {
          var byLoc = U.groupBy(Store.all('equipment'), 'location');
          var byCat = U.groupBy(Store.all('equipment'), 'category');
          return '<div class="stat-strip">' +
              '<div class="strip-item"><span>Items in ' + U.esc(e.location) + '</span><strong>' +
                U.sum(byLoc[e.location] || [], function (x) { return Number(x.quantity) || 0; }) + '</strong></div>' +
              '<div class="strip-item"><span>' + U.esc(e.category) + ' lines</span><strong>' + (byCat[e.category] || []).length + '</strong></div>' +
              '<div class="strip-item"><span>Inventory value</span><strong>' + U.shortMoney(Metrics.equipment().value) + '</strong></div>' +
            '</div>' +
            '<p class="help mt-2">Equipment should be checked at the start of every term and after every club event.</p>';
        })()
      });

      return '<div class="grid cols-2" style="grid-template-columns:minmax(0,1.5fr) minmax(0,1fr)">' + overview +
        '<div style="display:grid;gap:18px">' + history + usage + '</div></div>';
    },
    onDetailAction: function (action, btn, e) {
      if (action === 'service') openMaintenance(e);
      if (action === 'label') {
        Print.preview(Print.page(
          '<div class="print-doc-title"><h1>Club Inventory Label</h1><p>' + U.esc(Store.settings().clubName || 'MRHS ICT Club') + '</p></div>' +
          '<table><tbody>' +
            '<tr><th style="width:34%">Asset ID</th><td><strong>' + U.esc(e.assetId || '') + '</strong></td></tr>' +
            '<tr><th>Item</th><td>' + U.esc(e.name) + '</td></tr>' +
            '<tr><th>Category</th><td>' + U.esc(e.category) + '</td></tr>' +
            '<tr><th>Quantity</th><td>' + e.quantity + '</td></tr>' +
            '<tr><th>Location</th><td>' + U.esc(e.location) + '</td></tr>' +
            '<tr><th>Assigned to</th><td>' + U.esc(nameOf(e.assignedTo)) + '</td></tr>' +
            '<tr><th>Condition on issue</th><td>' + U.esc(e.condition) + '</td></tr>' +
            '<tr><th>Issued by</th><td>' + U.esc(Auth.currentUser() ? Auth.currentUser().name : '') + '</td></tr>' +
          '</tbody></table>' +
          '<p class="small">This label must remain attached to the item. Report any damage or loss to the ICT/Technical Director immediately.</p>' +
          '<div class="print-sign"><div><div class="line"></div>Item holder</div><div><div class="line"></div>ICT/Technical Director</div></div>',
          { meta: 'Inventory label' }
        ), { title: 'Inventory label — ' + e.assetId, icon: 'id-card', fileName: 'mrhs-ict-equipment-label' });
      }
    },
    printDoc: function (e) {
      return {
        title: 'Equipment record — ' + e.name,
        html: Print.page(
          '<div class="print-doc-title"><h1>Equipment Record</h1><p>' + U.esc(e.assetId || '') + '</p></div>' +
          '<table><tbody>' +
            '<tr><th style="width:32%">Item</th><td>' + U.esc(e.name) + '</td></tr>' +
            '<tr><th>Category</th><td>' + U.esc(e.category) + '</td></tr>' +
            '<tr><th>Quantity</th><td>' + e.quantity + '</td></tr>' +
            '<tr><th>Condition / status</th><td>' + U.esc(e.condition) + ' · ' + U.esc(statusOf(e)) + '</td></tr>' +
            '<tr><th>Location</th><td>' + U.esc(e.location) + '</td></tr>' +
            '<tr><th>Assigned to</th><td>' + U.esc(nameOf(e.assignedTo)) + '</td></tr>' +
            '<tr><th>Purchased</th><td>' + U.fmtDate(e.purchaseDate, 'long') + '</td></tr>' +
            '<tr><th>Value</th><td>' + U.money(totalValue(e), Store.settings().currency) + '</td></tr>' +
          '</tbody></table>' +
          '<h3>Maintenance history</h3>' +
          ((e.maintenance || []).length
            ? '<table><thead><tr><th>Date</th><th>Service</th><th>By</th><th>Cost</th></tr></thead><tbody>' +
                e.maintenance.map(function (m) {
                  return '<tr><td>' + U.fmtDate(m.date) + '</td><td>' + U.esc(m.note) + '</td><td>' + U.esc(m.by || '') + '</td><td>' + U.money(m.cost || 0, Store.settings().currency) + '</td></tr>';
                }).join('') + '</tbody></table>'
            : '<p>No maintenance recorded.</p>') +
          '<div class="print-sign"><div><div class="line"></div>ICT/Technical Director</div><div><div class="line"></div>Club Patron</div></div>',
          { meta: 'Equipment record' }
        )
      };
    },
    onMount: function (ctx, root, table) {
      root.addEventListener('click', function (e) {
        var seg = e.target.closest('[data-eq-view] [data-seg]');
        if (seg) {
          view = seg.getAttribute('data-seg');
          var cards = U.$('[data-eq-cards]', root);
          var tableHost = U.$('#module-table', root);
          if (cards) cards.hidden = view !== 'cards';
          if (tableHost) tableHost.hidden = view === 'cards';
          U.$$('[data-eq-view] [data-seg]', root).forEach(function (b) { b.classList.toggle('active', b === seg); });
          if (view === 'cards' && cards) renderCards(cards);
        }
      });
    },
    afterTable: function () { return '<div data-eq-cards hidden></div>'; }
  };

  function renderCards(host) {
    var rows = U.sortBy(Store.all('equipment'), 'name');
    host.innerHTML = UI.card({
      title: 'Equipment cards', icon: 'grid', sub: rows.length + ' inventory lines',
      body: '<div class="record-grid" style="padding:0">' + rows.map(function (e) {
        return '<article class="record-card"><div class="record-card-head">' +
          '<span class="avatar avatar-md">' + Icons.svg(categoryIcon(e.category)) + '</span>' +
          '<div class="rc-main"><h3><a href="#/equipment/' + e.id + '">' + U.esc(e.name) + '</a></h3>' +
          '<p class="small">' + U.esc(e.assetId || '') + ' · ' + U.esc(e.location) + '</p>' +
          '<div>' + UI.badge(e.condition, U.tone(e.condition === 'New' ? 'success' : e.condition === 'Good' ? 'info' : e.condition === 'Fair' ? 'warning' : 'danger')) +
            ' ' + UI.badge(e.quantity + ' in stock', 'neutral') + '</div></div></div>' +
          '<div class="record-card-body">' +
            UI.metaRow('user', 'Assigned to', U.esc(nameOf(e.assignedTo))) +
            UI.metaRow('coins', 'Value', U.money(totalValue(e), Store.settings().currency)) +
            UI.metaRow('calendar', 'Purchased', U.fmtDate(e.purchaseDate)) +
            UI.metaRow('activity', 'Status', U.esc(statusOf(e))) +
          '</div></article>';
      }).join('') + '</div>'
    });
  }

  ModuleHelper.page(config);

  global.Modules = global.Modules || {};
  global.Modules.Equipment = {
    config: config,
    openForm: function (values) {
      if (values && values.id) return ModuleHelper.openEdit(config, Store.find('equipment', values.id));
      return ModuleHelper.openCreate(config, values || {});
    },
    openMaintenance: openMaintenance,
    statusOf: statusOf,
    totalValue: totalValue
  };
})(window);
