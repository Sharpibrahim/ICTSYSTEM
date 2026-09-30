/**
 * Printable certificate — opened from a certificate record (and ?print=1
 * prints it straight away). Everything shown comes from the API payload, so
 * the printed sheet always matches the club register.
 */
(function () {
  var ICT = (window.ICT = window.ICT || {})
  var el = ICT.util.el
  var icon = ICT.util.icon
  var ui = ICT.ui

  function showCertificate(data) {
    var cert = data.certificate || data
    var settings = data.settings || ICT.store.settings || {}
    var overlay = el('div.modal-backdrop.certificate-backdrop')
    var sheet = el('div.certificate-sheet', [
      el('div.certificate', [
        el('div.certificate__body', [
          el('div.certificate__club', { text: settings.club_name || 'ICT Club' }),
          el('div.certificate__type', { text: cert.title || cert.award || 'Certificate of Achievement' }),
          el('div.certificate__rule'),
          el('div.certificate__tag', { text: 'This certificate is awarded to' }),
          el('div.certificate__name', { text: cert.recipient_name || cert.full_name || '—' }),
          el('div.certificate__meta', {
            text: [cert.class_level, cert.admission_number].filter(Boolean).join(' · ')
          }),
          el('p.certificate__text', {
            text:
              'for completing ' + (cert.course_title || cert.activity_title || 'the club programme') +
              (cert.issue_date ? ' on ' + ICT.util.formatDate(cert.issue_date) : '') +
              ', showing commitment, skill and good conduct throughout.'
          }),
          el('div.certificate__signs', [
            el('div.certificate__sign', [el('div.certificate__sign-line'), el('div.small', { text: settings.patron_name || 'Club Patron' })]),
            el('div.certificate__sign', [el('div.certificate__sign-line'), el('div.small', { text: 'Verification code: ' + (cert.verification_code || '—') })])
          ])
        ])
      ])
    ])

    var actions = el('div.certificate-actions', [
      ui.button('Print', { variant: 'primary', icon: 'print', onClick: () => window.print() }),
      ui.button('Close', { variant: 'ghost', icon: 'x', onClick: () => close() })
    ])

    overlay.appendChild(el('div.certificate-modal', [sheet, actions]))
    document.body.appendChild(overlay)
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) close()
    })
    function close() {
      overlay.remove()
    }
  }

  ICT.views = ICT.views || {}
  ICT.views.showCertificate = showCertificate
})()
