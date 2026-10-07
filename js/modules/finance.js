/* ==========================================================================
   MRHS ICT CLUB MASTER — js/modules/finance.js
   Club finances: income and expenses, receipts, balances, budget against
   actual spend, category breakdowns and printable financial statements.
   ========================================================================== */
(function (global) {
  'use strict';

  var U = Utils;
  var filterType = ''; // '', 'Income' or 'Expense'

  function currency() { return Store.settings().currency || 'UGX'; }
  function nameOf(id) {
    var m = Store.find('members', id), u = Store.find('users', id);
    return m ? m.fullName : (u ? u.name : (id || '—'));
  }
  function nextReference(type) {
    return CRUD.nextCode('transactions', 'reference', type === 'Income' ? 'INC-' : 'EXP-', 4) +
      ' · RCT-' + U.pad(1000 + Store.count('transactions') + 1, 5);
  }

  /* ══ Forms ════════════════════════════════════════════════════════════ */
  function openTransaction(type, rec) {
    type = rec ? rec.type : type;
    var isIncome = type === 'Income';
    return UI.formModal({
      title: rec ? 'Edit ' + type.toLowerCase() : 'Record ' + (isIncome ? 'income' : 'expense'),
      subtitle: isIncome ? 'Money received by the club' : 'Money spent by the club',
      icon: isIncome ? 'trending-up' : 'trending-down', size: 'sm',
      formHtml: Forms.render([
        { name: 'type', label: 'Type', type: 'select', options: ['Income', 'Expense'], value: type, required: true, colSpan: 2 },
        { name: 'category', label: 'Category', type: 'select', required: true, colSpan: 2,
          options: isIncome ? Data.INCOME_CATEGORIES : Data.EXPENSE_CATEGORIES, value: rec ? rec.category : '' },
        { name: 'amount', label: 'Amount (' + currency() + ')', type: 'number', required: true, min: 1, step: 500, value: rec ? rec.amount : '' },
        { name: 'date', label: 'Date', type: 'date', required: true, value: rec ? rec.date : U.todayISO() },
        { name: 'method', label: 'Payment method', type: 'select', options: ['Cash', 'Mobile Money', 'Bank Transfer', 'Cheque'], value: rec ? rec.method : 'Cash', required: true },
        { name: 'reference', label: 'Reference / receipt number', type: 'text', value: rec ? rec.reference : nextReference(type), help: 'Used on the printed receipt and in the transaction history.' },
        { name: 'payer', label: isIncome ? 'Received from' : 'Paid to', type: 'text', value: rec ? rec.payer : '', placeholder: isIncome ? 'Member, donor or sponsor' : 'Supplier or service provider' },
        { name: 'approvedBy', label: 'Approved by', type: 'member', value: rec ? rec.approvedBy : '' },
        { name: 'description', label: 'Description', type: 'textarea', required: true, colSpan: 2, rows: 3, value: rec ? rec.description : '' }
      ]),
      submitLabel: rec ? 'Save changes' : 'Record ' + (isIncome ? 'income' : 'expense'),
      onOpen: function (c, form) {
        Forms.init(form);
        var typeField = form.querySelector('[name="type"]');
        var catField = form.querySelector('[name="category"]');
        typeField.addEventListener('change', function () {
          var list = typeField.value === 'Income' ? Data.INCOME_CATEGORIES : Data.EXPENSE_CATEGORIES;
          catField.innerHTML = list.map(function (x) { return '<option value="' + U.attr(x) + '">' + U.esc(x) + '</option>'; }).join('');
        });
      },
      onSubmit: function (data) {
        var payload = {
          type: data.type, category: data.category, amount: Number(data.amount) || 0,
          date: data.date, method: data.method, reference: data.reference,
          payer: data.payer, description: data.description, approvedBy: data.approvedBy,
          recordedBy: Auth.currentUser() ? Auth.currentUser().id : null,
          receiptNo: (String(data.reference).match(/RCT-\d+/) || ['RCT-' + U.pad(1000 + Store.count('transactions') + 1, 5)])[0],
          demo: rec ? rec.demo : false
        };
        if (rec) Store.update('transactions', rec.id, payload);
        else Store.insert('transactions', payload);
        UI.toast(rec ? 'Transaction updated' : (payload.type === 'Income' ? 'Income recorded' : 'Expense recorded'),
          U.money(payload.amount, currency()) + ' · ' + payload.category + '. The balance has been updated.', 'success');
        Router.refresh();
      }
    });
  }

  /* ══ Sections ═════════════════════════════════════════════════════════ */
  function summaryCards() {
    var f = Metrics.finance();
    var bestIncome = U.sortBy(f.incomeByCategory, 'value', 'desc')[0];
    var biggestExpense = U.sortBy(f.expenseByCategory, 'value', 'desc')[0];
    return [
      { label: 'Total income', value: U.money(f.income, currency()), icon: 'trending-up', tone: 'success', foot: bestIncome ? 'Top source: ' + bestIncome.label : 'No income recorded' },
      { label: 'Total expenses', value: U.money(f.expenses, currency()), icon: 'trending-down', tone: 'danger', foot: biggestExpense ? 'Largest: ' + biggestExpense.label : 'No expenses recorded' },
      { label: 'Balance', value: U.money(f.balance, currency()), icon: 'wallet', tone: f.balance >= 0 ? 'primary' : 'danger', foot: f.balance >= 0 ? 'Funds available' : 'Club is overspent' },
      { label: 'Transactions', value: U.num(f.count), icon: 'receipt', tone: 'accent', foot: 'Since the club account opened' }
    ];
  }

  function chartCards() {
    var months = Metrics.financeByMonth(6);
    return UI.card({
      title: 'Income against expenses', icon: 'bar-chart', sub: 'Last 6 months',
      body: Charts.bar({
        categories: months.map(function (m) { return m.label; }),
        series: [
          { name: 'Income', data: months.map(function (m) { return m.income; }), color: '#12884f' },
          { name: 'Expenses', data: months.map(function (m) { return m.expenses; }), color: '#d64545' }
        ],
        height: 210,
        yFormat: function (v) { return U.shortMoney(v); }
      }) +
      '<div class="legend">' +
        '<span class="lg-item"><i style="background:#12884f"></i>Income</span>' +
        '<span class="lg-item"><i style="background:#d64545"></i>Expenses</span>' +
      '</div>'
    });
  }

  function breakdownCards() {
    var f = Metrics.finance();
    return '<div class="grid cols-2">' +
      UI.card({
        title: 'Income by source', icon: 'coins', flush: true,
        body: f.incomeByCategory.length
          ? '<table class="stat-table"><thead><tr><th>Source</th><th>Amount</th><th>Share</th></tr></thead><tbody>' +
              U.sortBy(f.incomeByCategory, 'value', 'desc').map(function (r) {
                return '<tr><td>' + U.esc(r.label) + '</td><td>' + U.money(r.value, currency()) + '</td>' +
                  '<td style="min-width:110px">' + UI.progressBar(U.percent(r.value, f.income), { size: 'sm' }) +
                  '<span class="xs muted">' + U.percent(r.value, f.income) + '%</span></td></tr>';
              }).join('') + '</tbody></table>'
          : UI.emptyState({ icon: 'coins', title: 'No income yet', message: 'Membership fees, donations and sponsorship will be listed here.' })
      }) +
      UI.card({
        title: 'Expenses by category', icon: 'receipt', flush: true,
        body: f.expenseByCategory.length
          ? '<table class="stat-table"><thead><tr><th>Category</th><th>Amount</th><th>Share</th></tr></thead><tbody>' +
              U.sortBy(f.expenseByCategory, 'value', 'desc').map(function (r) {
                return '<tr><td>' + U.esc(r.label) + '</td><td>' + U.money(r.value, currency()) + '</td>' +
                  '<td style="min-width:110px">' + UI.progressBar(U.percent(r.value, f.expenses), { size: 'sm' }) +
                  '<span class="xs muted">' + U.percent(r.value, f.expenses) + '%</span></td></tr>';
              }).join('') + '</tbody></table>'
          : UI.emptyState({ icon: 'receipt', title: 'No expenses yet', message: 'Equipment, printing, events and training costs will be listed here.' })
      }) +
    '</div>';
  }

  function receiptPrint(txn) {
    return Print.page(
      '<div class="print-doc-title"><h1>' + (txn.type === 'Income' ? 'Official Receipt' : 'Payment Voucher') + '</h1><p>' + U.esc(txn.reference || '') + '</p></div>' +
      '<table><tbody>' +
        '<tr><th style="width:34%">Receipt number</th><td>' + U.esc(txn.receiptNo || '—') + '</td></tr>' +
        '<tr><th>Date</th><td>' + U.fmtDate(txn.date, 'long') + '</td></tr>' +
        '<tr><th>' + (txn.type === 'Income' ? 'Received from' : 'Paid to') + '</th><td>' + U.esc(txn.payer || '—') + '</td></tr>' +
        '<tr><th>Category</th><td>' + U.esc(txn.category) + '</td></tr>' +
        '<tr><th>Amount</th><td><strong>' + U.money(txn.amount, currency()) + '</strong></td></tr>' +
        '<tr><th>Payment method</th><td>' + U.esc(txn.method) + '</td></tr>' +
        '<tr><th>Description</th><td>' + U.esc(txn.description) + '</td></tr>' +
        '<tr><th>Approved by</th><td>' + U.esc(nameOf(txn.approvedBy)) + '</td></tr>' +
        '<tr><th>Recorded by</th><td>' + U.esc(nameOf(txn.recordedBy)) + '</td></tr>' +
      '</tbody></table>' +
      '<p class="small">' + U.esc(Store.settings().clubName || 'MRHS ICT Club') + ' · ' + U.esc(Store.settings().schoolName || '') + '</p>' +
      '<div class="print-sign"><div><div class="line"></div>Treasurer</div><div><div class="line"></div>Club Patron</div></div>',
      { meta: txn.type === 'Income' ? 'Receipt' : 'Payment voucher' }
    );
  }

  function statementPrint(period) {
    var f = Metrics.finance();
    return Print.page(
      '<div class="print-doc-title"><h1>Financial Statement</h1><p>' + U.esc(period || ('Whole club account as at ' + U.fmtDate(new Date(), 'long'))) + '</p></div>' +
      '<h3>Summary</h3><table><thead><tr><th>Item</th><th style="text-align:right">Amount (' + currency() + ')</th></tr></thead><tbody>' +
        '<tr><td>Total income</td><td style="text-align:right">' + U.money(f.income, currency()) + '</td></tr>' +
        '<tr><td>Total expenses</td><td style="text-align:right">' + U.money(f.expenses, currency()) + '</td></tr>' +
        '<tr><th>Balance carried forward</th><th style="text-align:right">' + U.money(f.balance, currency()) + '</th></tr>' +
      '</tbody></table>' +
      '<h3>Income by source</h3><table><thead><tr><th>Source</th><th style="text-align:right">Amount</th></tr></thead><tbody>' +
        U.sortBy(f.incomeByCategory, 'value', 'desc').map(function (r) {
          return '<tr><td>' + U.esc(r.label) + '</td><td style="text-align:right">' + U.money(r.value, currency()) + '</td></tr>';
        }).join('') + '</tbody></table>' +
      '<h3>Expenses by category</h3><table><thead><tr><th>Category</th><th style="text-align:right">Amount</th></tr></thead><tbody>' +
        U.sortBy(f.expenseByCategory, 'value', 'desc').map(function (r) {
          return '<tr><td>' + U.esc(r.label) + '</td><td style="text-align:right">' + U.money(r.value, currency()) + '</td></tr>';
        }).join('') + '</tbody></table>' +
      '<h3>Transaction history</h3><table><thead><tr><th>Date</th><th>Reference</th><th>Details</th><th>Type</th><th style="text-align:right">Amount</th></tr></thead><tbody>' +
        U.sortBy(Store.all('transactions'), 'date', 'desc').map(function (t) {
          return '<tr><td>' + U.fmtDate(t.date) + '</td><td>' + U.esc(t.reference || '') + '</td><td>' + U.esc(t.category + ' — ' + t.description) + '</td>' +
            '<td>' + U.esc(t.type) + '</td><td style="text-align:right">' + U.money(t.amount, currency()) + '</td></tr>';
        }).join('') + '</tbody></table>' +
      '<div class="print-sign"><div><div class="line"></div>Treasurer</div><div><div class="line"></div>President</div><div><div class="line"></div>Patron</div></div>',
      { meta: 'Financial statement' }
    );
  }

  /* ══ Custom page ══════════════════════════════════════════════════════ */
  function rows() {
    var all = Store.all('transactions');
    return filterType ? all.filter(function (t) { return t.type === filterType; }) : all;
  }

  Router.view('/finance', {
    title: 'Finance', icon: 'wallet', module: 'finance',
    render: function () {
      if (!Auth.can('finance', 'view')) return UI.restricted('finance');
      return '<div class="page">' +
        UI.pageHeader({
          title: 'Finance', icon: 'wallet',
          subtitle: 'Club income, expenditure, balances and receipts.',
          actions: (Auth.can('finance', 'create')
            ? '<button type="button" class="btn btn-outline" data-fin="income">' + Icons.svg('trending-up', { class: 'btn-ico' }) + 'Record income</button>' +
              '<button type="button" class="btn btn-primary" data-fin="expense">' + Icons.svg('trending-down', { class: 'btn-ico' }) + 'Record expense</button>'
            : '') +
            (Auth.can('finance', 'export') ? '<button type="button" class="btn btn-outline" data-fin="statement">' + Icons.svg('print', { class: 'btn-ico' }) + 'Statement</button>' : '')
        }) +
        '<div class="stat-grid">' + summaryCards().map(function (s) { return UI.statCard(s); }).join('') + '</div>' +
        '<div class="grid cols-2" style="grid-template-columns:minmax(0,1.4fr) minmax(0,1fr)">' + chartCards() +
          UI.card({
            title: 'Quick actions', icon: 'zap',
            body: '<div class="quick-grid">' +
              (Auth.can('finance', 'create') ? '<button type="button" class="quick-action" data-fin="income">' + Icons.svg('plus') + '<span>Record income</span></button>' : '') +
              (Auth.can('finance', 'create') ? '<button type="button" class="quick-action" data-fin="expense">' + Icons.svg('minus') + '<span>Record expense</span></button>' : '') +
              '<button type="button" class="quick-action" data-fin="statement">' + Icons.svg('file-text') + '<span>Print statement</span></button>' +
              '<button type="button" class="quick-action" data-fin="receipts">' + Icons.svg('receipt') + '<span>Print a receipt</span></button>' +
            '</div>' +
            '<div class="alert alert-info mt-2">' + Icons.svg('info') +
              '<div>Membership fee is <strong>' + U.money(Store.settings().membershipFee || 5000, currency()) + '</strong> per term as agreed by the cabinet.</div></div>'
          }) +
        '</div>' +
        breakdownCards() +
        (Auth.can('finance', 'delete') ? '' : '<div class="alert alert-warning">' + Icons.svg('lock') + '<div>You can view financial records but only the Treasurer and Administrator can add or change transactions.</div></div>') +
        '<div id="module-table"></div>' +
        '</div>';
    },
    mount: function (ctx, root) {
      var host = U.$('#module-table', root);
      var table = new UI.DataTable(host, {
        title: 'Transaction history', icon: 'receipt',
        sub: 'Every payment in and out of the club account',
        columns: [
          { key: 'date', label: 'Date', render: function (t) { return U.fmtDate(t.date) + '<br><span class="td-muted">' + U.timeAgo(t.date) + '</span>'; } },
          { key: 'reference', label: 'Reference', render: function (t) { return '<span class="mono">' + U.esc(t.reference || '') + '</span><br><span class="td-muted">' + U.esc(t.receiptNo || '') + '</span>'; } },
          { key: 'description', label: 'Description', render: function (t) { return U.esc(t.description) + '<br><span class="td-muted">' + U.esc(t.category) + (t.payer ? ' · ' + U.esc(t.payer) : '') + '</span>'; } },
          { key: 'method', label: 'Method', render: function (t) { return UI.badge(t.method, 'neutral'); } },
          { key: 'type', label: 'Type', render: function (t) { return UI.badge(t.type, t.type === 'Income' ? 'success' : 'danger', { icon: t.type === 'Income' ? 'arrow-down' : 'arrow-up' }); } },
          { key: 'amount', label: 'Amount', render: function (t) { return '<strong class="' + (t.type === 'Income' ? 'text-success' : 'text-danger') + '">' + (t.type === 'Income' ? '+' : '−') + U.money(t.amount, currency()) + '</strong>'; } },
          { key: 'approvedBy', label: 'Approved by', render: function (t) { return U.esc(nameOf(t.approvedBy)); } }
        ],
        rows: rows,
        searchKeys: function (t) { return [t.description, t.reference, t.receiptNo, t.category, t.payer, t.method, nameOf(t.approvedBy)]; },
        filters: [
          { key: 'type', label: 'All transaction types', options: ['Income', 'Expense'] },
          { key: 'category', label: 'All categories', options: Data.INCOME_CATEGORIES.concat(Data.EXPENSE_CATEGORIES) }
        ],
        toolbarExtra: (Auth.can('finance', 'export') ? '<button type="button" class="btn btn-outline btn-sm" data-fin="export">' + Icons.svg('download', { class: 'btn-ico' }) + 'Export CSV</button>' : ''),
        rowActions: function (t) {
          var out = '<button type="button" class="mini-btn" data-txn-receipt="' + t.id + '" title="Print receipt">' + Icons.svg('print') + '</button>';
          if (Auth.can('finance', 'edit')) out += '<button type="button" class="mini-btn" data-txn-edit="' + t.id + '" title="Edit transaction">' + Icons.svg('edit') + '</button>';
          if (Auth.can('finance', 'delete')) out += '<button type="button" class="mini-btn danger" data-txn-del="' + t.id + '" title="Delete transaction">' + Icons.svg('trash') + '</button>';
          return out;
        },
        exportName: 'mrhs-ict-finance',
        empty: { icon: 'wallet', title: 'No transactions yet', message: 'Record membership fees, donations or expenses to build the club account.' }
      });
      table.render();

      root.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-fin]');
        if (btn) {
          var what = btn.getAttribute('data-fin');
          if (what === 'income') openTransaction('Income');
          if (what === 'expense') openTransaction('Expense');
          if (what === 'statement') Print.preview(statementPrint(), { title: 'Financial statement', icon: 'wallet', fileName: 'mrhs-ict-financial-statement' });
          if (what === 'receipts') {
            UI.modal({
              title: 'Print a receipt', icon: 'receipt', size: 'sm',
              subtitle: 'Choose the transaction to reprint.',
              body: '<div class="list-rows">' + U.sortBy(Store.all('transactions'), 'date', 'desc').slice(0, 12).map(function (t) {
                return '<button type="button" class="list-row" data-print-txn="' + t.id + '">' +
                  '<span class="tl-dot">' + Icons.svg('receipt') + '</span>' +
                  '<span class="list-row-main"><strong>' + U.esc(U.truncate(t.description, 46)) + '</strong><span>' + U.fmtDate(t.date) + ' · ' + U.esc(t.reference || '') + '</span></span>' +
                  '<span class="list-row-side">' + U.money(t.amount, currency()) + '</span></button>';
              }).join('') + '</div>',
              actions: [{ label: 'Close', tone: 'ghost', onClick: function (c) { c.close(); } }]
            });
          }
          if (what === 'export') {
            var list = filterType ? rows() : Store.all('transactions');
            CRUD.exportRows({
              rows: list, module: 'finance', name: 'mrhs-ict-finance',
              columns: [
                { key: 'date', label: 'Date' }, { key: 'reference', label: 'Reference' }, { key: 'receiptNo', label: 'Receipt' },
                { key: 'type', label: 'Type' }, { key: 'category', label: 'Category' }, { key: 'amount', label: 'Amount' },
                { key: 'method', label: 'Method' }, { key: 'payer', label: 'Payer / payee' }, { key: 'description', label: 'Description' }
              ]
            });
          }
          return;
        }
        var receipt = e.target.closest('[data-print-txn], [data-txn-receipt]');
        if (receipt) {
          var id = receipt.getAttribute('data-print-txn') || receipt.getAttribute('data-txn-receipt');
          var txn = Store.find('transactions', id);
          if (txn) Print.preview(receiptPrint(txn), { title: txn.type + ' — ' + (txn.reference || ''), icon: 'receipt', fileName: 'mrhs-ict-receipt-' + (txn.receiptNo || txn.id) });
          return;
        }
        var edit = e.target.closest('[data-txn-edit]');
        if (edit) { openTransaction(null, Store.find('transactions', edit.getAttribute('data-txn-edit'))); return; }
        var del = e.target.closest('[data-txn-del]');
        if (del) {
          CRUD.remove({
            module: 'finance', collection: 'transactions', id: del.getAttribute('data-txn-del'),
            label: 'this transaction', title: 'Delete transaction',
            details: 'The balance will be recalculated. You can undo this immediately afterwards.',
            after: function () { table.refresh(); }
          });
        }
      });
      root.addEventListener('change', function (e) {
        var seg = e.target.closest('[data-fin-filter]');
        if (seg) { filterType = seg.value; table.refresh(); }
      });
    }
  });

  global.Modules = global.Modules || {};
  global.Modules.Finance = {
    openTransaction: openTransaction,
    statementPrint: statementPrint,
    receiptPrint: receiptPrint,
    currency: currency
  };
})(window);
