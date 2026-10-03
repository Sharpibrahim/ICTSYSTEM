import io, sys

def patch(path, reps, drop=None):
    s = io.open(path, encoding='utf-8').read()
    ok = True
    for name, a, b in reps:
        n = s.count(a)
        print('%-18s %d' % (name, n))
        if n != 1:
            ok = False
            continue
        s = s.replace(a, b)
    if not ok:
        print('!! nothing written to', path)
        sys.exit(1)
    if drop:
        for name, a in drop:
            n = s.count(a)
            print('%-18s %d' % (name, n))
            if n != 1:
                print('!! drop failed for', name)
                sys.exit(1)
            s = s.replace(a, '')
    io.open(path, 'w', encoding='utf-8').write(s)
    print('written', path)

p = 'js/modules/settings.js'
s = io.open(p, encoding='utf-8').read()

# 1. replace the whole cert design card with the shared picker
start = s.index('  function certDesignCard() {')
end = s.index('  function appearanceTab() {')
newcard = """  function certDesignCard() {
    var picker = (global.CertBG && CertBG.designerHTML)
      ? CertBG.designerHTML()
      : '<p class="muted">Certificate backgrounds are unavailable in this browser.</p>';
    return UI.card({
      title: 'Certificate background', icon: 'award',
      sub: 'Certificates print in A4 landscape (297 × 210 mm). Pick a design or upload your own image.',
      body: picker,
      foot: '<span class="muted small">' + Icons.svg('info') + ' The two built-in designs are vector graphics — they stay sharp at any print size. Uploaded images are stored in this browser and embedded in every certificate, print-out and download.</span>'
    });
  }

"""
removed_card = s[start:end]
s = s[:start] + newcard + s[end:]
io.open(p, 'w', encoding='utf-8').write(s)
print('certDesignCard replaced')

reps = [
('mount', """    mount: function (ctx, root) {
      var bgInput = root.querySelector('#cert-bg-file');
      if (bgInput) {
        bgInput.addEventListener('change', function () {
          var file = this.files && this.files[0];
          if (!file) return;
          CertBG.setCustomFile(file).then(function (ok) {
            if (!ok) return;
            UI.toast('Certificate background updated', 'Your image \u201c' + file.name + '\u201d is now the active certificate design.', 'success');
            Router.refresh();
          });
        });
      }
      root.addEventListener('click', function (e) {""",
"""    mount: function (ctx, root) {
      if (global.CertBG && CertBG.bindDesigner) {
        CertBG.bindDesigner(root, { onChange: function () { Router.refresh(); } });
      }
      root.addEventListener('click', function (e) {"""),

('pick-handler', """        var pick = e.target.closest('[data-cert-design]');
        if (pick) {
          if (!Auth.can('settings', 'edit')) { UI.toast('Not allowed', 'Your role cannot change the certificate design.', 'warning'); return; }
          var which = pick.getAttribute('data-cert-design');
          if (which === 'custom' && !hasCertCustom()) {
            var file = U.$('#cert-bg-file', root);
            if (file) file.click();
            return;
          }
          CertBG.useBuiltin(which);
          UI.toast('Certificate design updated', 'Every certificate now uses the ' +
            (which === 'classic' ? 'cream & ornate' : 'navy & gold') + ' design.', 'success');
          Router.refresh();
          return;
        }
        var theme = e.target.closest('[data-theme-choice]');""",
"""        var theme = e.target.closest('[data-theme-choice]');"""),

('clear-branch', """        if (what === 'cert-bg-clear') {
          UI.confirm({
            title: 'Remove your image',
            message: 'Remove your uploaded certificate background and go back to the built-in navy & gold design?',
            confirmLabel: 'Remove image', icon: 'award', tone: 'warning'
          }).then(function (ok) {
            if (!ok) return;
            CertBG.clearCustom();
            UI.toast('Certificate design updated', 'Certificates now use the built-in navy & gold design.', 'success');
            Router.refresh();
          });
          return;
        }
        if (what === 'cert-bg-preview') { previewCertificate(); return; }
""", ''),

('helpers', """  function hasCertCustom() { return !!s().certificateBgFileId; }

  function previewCertificate() {
    var cert = Store.all('certificates').filter(function (c) { return c.status !== 'Revoked'; })[0] || Store.all('certificates')[0];
    if (!cert) { UI.toast('No certificate to preview', 'Issue a certificate first.', 'warning'); return; }
    CertBG.loadCustom(function () {
      Print.preview(Print.certificate(cert), {
        title: 'Certificate preview', icon: 'award',
        subtitle: 'This is exactly how every certificate will print, including the background.',
        fileName: 'mrhs-ict-certificate-' + (cert.certificateNumber || cert.id)
      });
    });
  }

""", ''),
]
patch(p, reps)
