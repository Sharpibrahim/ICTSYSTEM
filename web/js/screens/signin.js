/* ==========================================================================
   signin.js — /login

   • the same box accepts a username or an email address
   • a wrong password says so plainly, with the case-sensitivity hint
   • an unreachable server is explained instead of “Failed to fetch”
   • the session notice only appears when a real session expired; it clears the
     moment the user starts typing
   ========================================================================== */
(function () {
  var ICT = window.ICT = window.ICT || {}
  var el = ICT.el
  var ui = ICT.widgets
  var icon = ICT.icon

  function render(root) {
    var identifier = el('input.input', { id: 'email', name: 'email', placeholder: 'Sharp or sharp@school.ac.ug', autocomplete: 'username', autocapitalize: 'none', spellcheck: 'false' })
    var password = el('input.input', { id: 'password', name: 'password', type: 'password', placeholder: 'Your password', autocomplete: 'current-password' })
    var reveal = el('button.pw-toggle', { type: 'button', title: 'Show the password', onclick: function () {
      var showing = password.type === 'text'
      password.type = showing ? 'password' : 'text'
      reveal.title = showing ? 'Show the password' : 'Hide the password'
      ICT.mount(reveal, [icon(showing ? 'eye' : 'shield', 16)])
    } }, [icon('eye', 16)])

    var message = el('div')
    var submit = ui.button('Sign in', { variant: 'primary', block: true, icon: 'logout' })
    /* A real submit button, so clicking it — or pressing Enter in either box —
       runs the form's onsubmit handler in a browser and in the tests alike. */
    submit.type = 'submit'
    var capsWarn = el('div.small.muted', { style: { display: 'none' }, text: 'Caps Lock is on — passwords are case-sensitive.' })

    /* The session notice: shown when the app signed the user out because the
       session really ended. Typing clears it, and it never mentions demo data. */
    function showNotice(text, tone) {
      ICT.mount(message, text ? [ui.notice(text, tone || 'warn')] : [])
    }
    /* The notice stays put while the screen is re-painted (the app may paint
       the sign-in screen more than once while the old session is being cleared),
       and it goes as soon as the user starts typing or signs in. */
    var notice = ICT.session.getNotice()
    if (notice) showNotice(notice, 'warn')

    function clearNotice() {
      if (!ICT.session.getNotice()) return
      ICT.session.setNotice('')
      ICT.mount(message, [])
    }
    identifier.addEventListener('input', clearNotice)
    password.addEventListener('input', clearNotice)

    password.addEventListener('keydown', function (event) {
      if (event.key === 'CapsLock') capsWarn.style.display = 'block'
    })
    password.addEventListener('keyup', function (event) {
      if (event.key === 'CapsLock' || event.getModifierState) {
        var on = event.getModifierState && event.getModifierState('CapsLock')
        capsWarn.style.display = on ? 'block' : 'none'
      }
    })

    function signing(isBusy) {
      submit.disabled = isBusy
      ICT.mount(submit, [icon('logout', 17), el('span', { text: isBusy ? 'Signing in…' : 'Sign in' })])
    }

    async function submitForm(event) {
      if (event) event.preventDefault()
      var who = identifier.value.trim()
      var secret = password.value
      if (!who || !secret) {
        showNotice('Type your username (or email) and your password.', 'error')
        ;(!who ? identifier : password).focus()
        return
      }
      signing(true)
      ICT.mount(message, [])
      try {
        var res = await ICT.api.login(who, secret)
        ICT.session.setToken(res.token)
        ICT.store.setUser(res.user)
        ICT.session.setNotice('')
        if (res.settings) ICT.store.state.settings = res.settings
        if (!ICT.store.state.loaded) {
          try { await ICT.store.boot() } catch (error) { /* the dashboard will try again */ }
        }
        ICT.nav.go('/', { replace: true })
      } catch (error) {
        signing(false)
        var text = String(error && error.message ? error.message : '')
        if (!error || error.status === 0) {
          /* The request never arrived — explain it, and keep the form usable. */
          showNotice('The club system server could not be reached. Check that the server is running (npm run serve), then try again.', 'error')
        } else if (error.status === 401) {
          showNotice('Incorrect password. Passwords are case-sensitive — check Caps Lock, then try again.', 'error')
        } else {
          showNotice(text || 'Sign-in failed. Please try again.', 'error')
        }
        password.select && password.select()
      }
    }

    var form = el('form', { onsubmit: submitForm }, [
      ui.field('Username or email', identifier),
      ui.field('Password', el('div.pw-wrap', [password, reveal])),
      capsWarn,
      submit
    ])

    ICT.mount(root, el('div.auth', [
      el('div.auth__card', [
        el('div.auth__brand', [
          el('div.rail__mark', { text: 'ICT' }),
          el('div', [
            el('div.auth__title', { text: 'ICT Club Management System' }),
            el('div.auth__sub', { text: 'Sign in to your club' })
          ])
        ]),
        message,
        form,
        el('div.auth__foot', [
          el('span', { text: 'Lost your password? Ask the club patron to reset it.' }),
          el('a', { href: '/verify', onclick: function (event) { event.preventDefault(); ICT.nav.go('/verify') }, text: 'Verify a certificate' })
        ])
      ])
    ]))

    identifier.focus()
    return null
  }

  ICT.screens = ICT.screens || {}
  ICT.screens.signin = render
})()
