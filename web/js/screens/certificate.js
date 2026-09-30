/* ==========================================================================
   certificate.js — the printable certificate sheet.

   ICT.screens.showCertificate(id) opens the certificate drawn the way it will
   be printed, with a Print button. Used from the certificates list and from a
   certificate's own page.
   ========================================================================== */
(function () {
  var ICT = window.ICT = window.ICT || {}
  var el = ICT.el
  var ui = ICT.widgets
  var icon = ICT.icon
  var fmt = ICT.fmt

  async function showCertificate(id) {
    var backdrop = el('div.cert-backdrop', ui.loading('Preparing the certificate…'))
    document.body.appendChild(backdrop)

    function close() {
      document.removeEventListener('keydown', onKey)
      backdrop.remove()
    }
    function onKey(event) { if (event.key === 'Escape') close() }
    document.addEventListener('keydown', onKey)
    backdrop.addEventListener('click', function (event) { if (event.target === backdrop) close() })

    try {
      var res = await ICT.api.certificate(id)
      var certificate = res.certificate || {}
      var settings = res.settings || ICT.store.settings || {}
      var related = res.related || {}

      var sheet = el('div', [
        el('div.certificate', [
          el('div.certificate__crest', { text: '★' }),
          el('h2', { text: certificate.title || 'Certificate of Achievement' }),
          el('div.certificate__club', { text: [settings.club_name, settings.institution].filter(Boolean).join(' • ') }),
          el('div.certificate__body', [
            el('div', { text: 'This certificate is proudly presented to' }),
            el('div.certificate__name', { text: certificate.recipient_name || '—' }),
            el('div', {
              text: (certificate.description || certificate.remarks || '') ||
                ('for taking part in ' + (related.title || certificate.related_label || 'the club programme') +
                  (related.date ? ' (' + fmt.date(related.date) + ')' : '') + ', and completing it to the club’s satisfaction.')
            }),
            certificate.recipient_class ? el('div.small.muted', { text: 'Class ' + certificate.recipient_class }) : el('span')
          ]),
          el('div.certificate__meta', [
            el('div', [
              el('div', { text: 'Certificate number' }),
              el('b.certificate__code', { text: certificate.certificate_number || '—' })
            ]),
            el('div', [
              el('div', { text: 'Issued on' }),
              el('b', { text: fmt.date(certificate.issue_date || certificate.created_at) })
            ]),
            el('div', [
              el('div', { text: 'Verify at' }),
              el('b.certificate__code', { text: certificate.verification_code || '—' })
            ])
          ]),
          el('div.certificate__meta', { style: { marginTop: '1.2rem' } }, [
            el('div', [el('div', { text: 'Patron' }), el('b', { text: settings.patron_name || '________________' })]),
            el('div', [el('div', { text: 'Date' }), el('b', { text: fmt.date(certificate.issue_date || new Date()) })])
          ])
        ]),
        el('div.cert-actions', [
          ui.button('Print', { variant: 'primary', icon: 'printer', onClick: function () { window.print() } }),
          ui.button('Close', { variant: 'ghost', icon: 'x', onClick: close })
        ])
      ])

      ICT.mount(backdrop, sheet)
    } catch (error) {
      ICT.mount(backdrop, el('div', [
        ui.notice('Could not prepare the certificate. ' + error.message, 'error'),
        el('div.cert-actions', [ui.button('Close', { variant: 'ghost', onClick: close })])
      ]))
    }
  }

  ICT.screens = ICT.screens || {}
  ICT.screens.showCertificate = showCertificate
})()
