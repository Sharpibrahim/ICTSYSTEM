/**
 * Public certificate verification — /verify
 *
 * Anyone (a parent, a school, an employer) types the code printed on the
 * certificate and sees whether it is genuine. No sign-in required.
 */
(function () {
  var ICT = (window.ICT = window.ICT || {})
  var el = ICT.util.el
  var icon = ICT.util.icon
  var ui = ICT.ui

  function render(root) {
    var code = (ICT.router.query().get('code') || '').toUpperCase()
    var input = el('input.input', { value: code, placeholder: 'ICT-XXXXXX', autocomplete: 'off' })
    var result = el('div.mt-3')

    var form = el('form.card', {
      onsubmit: (event) => {
        event.preventDefault()
        check(input.value.trim().toUpperCase())
      }
    }, [
      el('div.card__head', [
        el('div', [el('h3', { text: 'Verify a certificate' }), el('p.small.muted', { text: 'Type the code printed on the certificate.' })]),
        el('span.stat__icon', [icon('shield', 18)])
      ]),
      el('div.card__body', [
        el('div.field', [
          el('label.field__label', { for: 'code' }, [el('span', { text: 'Certificate code' })]),
          el('div.input-with-button', [input, ui.button('Verify', { variant: 'primary', icon: 'search', type: 'submit' })])
        ]),
        result
      ])
    ])

    ICT.util.mount(root, el('div.login-page.verify-page', [
      el('div.login-art', [
        el('div.login-art__logo', { text: 'ICT' }),
        el('h1', { text: 'Certificate verification' }),
        el('p', { text: 'Every certificate the club issues carries a unique code. Checking it here proves the certificate is genuine and shows who it was issued to.' }),
        el('div.login-art__features', [
          ['award', 'Issued by the ICT Club'],
          ['check', 'Verified against the club register'],
          ['external', 'No account needed']
        ].map(([name, text]) => el('div.login-art__feature', [icon(name, 16), el('span', { text: text })])))
      ]),
      el('div.login-form-wrap', form)
    ]))

    if (code) check(code)

    async function check(value) {
      if (!value) {
        ICT.util.mount(result, el('div.notice', { text: 'Enter the code printed on the certificate.' }))
        return
      }
      ICT.util.mount(result, ui.loading('Checking the club register…'))
      try {
        var res = await ICT.api.verify(value)
        var data = res.data || res
        if (!data || data.valid === false || (!data.certificate && !data.recipient)) {
          ICT.util.mount(result, el('div.notice.notice--error', [
            el('div.notice__text', { text: 'No certificate matches “' + value + '”. Check the code and try again, or ask the club patron.' })
          ]))
          return
        }
        var cert = data.certificate || data
        ICT.util.mount(result, el('div.verify-result', [
          el('div.verify-result__seal', [icon('check', 22)]),
          el('h3', { text: 'Genuine certificate' }),
          ui.kv([
            ['Recipient', cert.recipient_name || cert.full_name || data.recipient || '—'],
            ['Award', cert.title || cert.award || '—'],
            ['Course / activity', cert.course_title || cert.activity_title || '—'],
            ['Issued', ICT.util.formatDate(cert.issue_date || cert.created_at)],
            ['Code', cert.verification_code || value],
            ['Issued by', (ICT.store.settings && ICT.store.settings.club_name) || 'ICT Club']
          ])
        ]))
      } catch (error) {
        ICT.util.mount(result, el('div.notice.notice--error', [el('div.notice__text', { text: error.message })]))
      }
    }
  }

  ICT.views = ICT.views || {}
  ICT.views.verify = render
})()
