/* ==========================================================================
   verify.js — /verify  (no sign-in needed)

   Anyone — a parent, another school, an employer — types the code printed on
   a certificate and sees whether it is genuine, and who it was issued to.
   ========================================================================== */
(function () {
  var ICT = window.ICT = window.ICT || {}
  var el = ICT.el
  var ui = ICT.widgets
  var icon = ICT.icon
  var fmt = ICT.fmt

  function render(root) {
    var prefill = (ICT.nav.query().get('code') || '').toUpperCase()
    var input = el('input.input', { id: 'code', value: prefill, placeholder: 'ICT-XXXXXX', autocomplete: 'off', autocapitalize: 'characters', spellcheck: 'false' })
    var result = el('div.mt-3')

    async function check(code) {
      var value = String(code || '').trim().toUpperCase()
      if (!value) {
        ICT.mount(result, [ui.notice('Type the code from the certificate first.', 'warn')])
        return
      }
      ICT.mount(result, [ui.loading('Checking the club register…')])
      try {
        var res = await ICT.api.verify(value)
        var certificate = res.certificate || {}
        if (res.valid) {
          ICT.mount(result, [ui.card('Genuine certificate', {
            icon: 'award',
            body: el('div', [
              ui.notice('Genuine certificate — issued by the club and still valid.', 'success'),
              el('div.mt-2', [ui.kv([
                ['Certificate number', certificate.certificate_number || certificate.number || '—'],
                ['Recipient', certificate.recipient_name || certificate.recipient || '—'],
                ['Title', certificate.title || '—'],
                ['Issued on', fmt.date(certificate.issue_date || certificate.issued_at)],
                ['Verification code', certificate.verification_code || value]
              ])])
            ])
          })])
        } else {
          ICT.mount(result, [ui.notice('No certificate carries that code. Check the spelling, or ask the club patron.', 'error')])
        }
      } catch (error) {
        ICT.mount(result, [ui.notice(error.status === 404 ? 'No certificate carries that code.' : 'Could not reach the club register. ' + error.message, 'error')])
      }
    }

    var form = el('form.card', {
      onsubmit: function (event) {
        event.preventDefault()
        check(input.value)
      }
    }, [
      el('div.card__head', [
        el('div', { style: { flex: '1 1 auto' } }, [
          el('h3', { text: 'Verify a certificate' }),
          el('p', { text: 'Type the code printed on the certificate.' })
        ]),
        el('span.stat__icon', [icon('shield', 18)])
      ]),
      el('div.card__body', [
        ui.field('Certificate code', input, 'It looks like ICT-8A3F2C and is printed at the bottom of the certificate.'),
        el('div.mt-2', [ui.button('Verify', { variant: 'primary', icon: 'shield', onClick: function () { check(input.value) } })])
      ])
    ])

    ICT.mount(root, el('div.verify', el('div.verify__inner', [
      el('div.auth__brand', [
        el('div.rail__mark', { text: 'ICT' }),
        el('div', [
          el('div.auth__title', { text: (ICT.store.settings || {}).club_name || 'ICT Club' }),
          el('div.auth__sub', { text: 'Certificate verification' })
        ])
      ]),
      form,
      result,
      el('div.auth__foot', [
        el('span', { text: 'Issued by the ICT Club — verified against the club register.' }),
        el('a', { href: '/login', onclick: function (event) { event.preventDefault(); ICT.nav.go('/login') }, text: 'Staff sign in' })
      ])
    ])))

    if (prefill) check(prefill)
    input.focus()
    return null
  }

  ICT.screens = ICT.screens || {}
  ICT.screens.verify = render
})()
