/**
 * Sign in / register screen.
 *
 * Behaviour that the club asked for and that the tests protect:
 *  • one administrator account (Sharp / SunnyDay@2026); other accounts are
 *    created in Administration → User Accounts or by students registering here
 *  • the "your session ended" notice appears only for a session that really
 *    ended, never beside "Incorrect password", and clears as soon as the user
 *    types
 *  • passwords are case-sensitive — there is a reveal button and a Caps Lock
 *    warning
 */
(function () {
  var ICT = (window.ICT = window.ICT || {})
  var el = ICT.util.el
  var icon = ICT.util.icon
  var ui = ICT.ui

  function render(root, state) {
    var notice = ICT.session.takeSessionNotice()
    var mode = 'login'
    var busy = false

    var wrap = el('div.login-page')
    var art = el('div.login-art', [
      el('div.login-art__logo', { text: 'ICT' }),
      el('h1', { text: 'ICT Club Management System' }),
      el('p', { text: 'Students, executive committee, club dues, meetings, attendance, certificates and projects — one place for the whole club.' }),
      el('div.login-art__features', [
        ['users', 'Every student with their class, stream and guardian'],
        ['coins', 'Club dues per term, payments and receipts'],
        ['award', 'Course certificates with public verification'],
        ['file', 'Meetings, attendance registers and reports']
      ].map(([name, text]) => el('div.login-art__feature', [icon(name, 16), el('span', { text: text })])))
    ])

    var noticeNode = el('div.notice', { role: 'status' })
    function setNotice(message) {
      ICT.util.clear(noticeNode)
      if (!message) {
        noticeNode.style.display = 'none'
        return
      }
      noticeNode.style.display = ''
      noticeNode.appendChild(el('div.notice__text', { text: message }))
      noticeNode.appendChild(el('button', { type: 'button', title: 'Dismiss', 'aria-label': 'Dismiss', onclick: () => setNotice(null) }, [icon('x', 14)]))
    }
    setNotice(notice)

    var errorNode = el('div.field__error', { role: 'alert' })
    var identifier = el('input.input', { id: 'email', type: 'text', autocomplete: 'username', placeholder: 'Sharp' })
    var password = el('input.input', { id: 'password', type: 'password', autocomplete: 'current-password', placeholder: 'Your password' })
    var reveal = el('button.btn.btn--ghost.btn--icon.reveal', {
      type: 'button', title: 'Show password', 'aria-label': 'Show password',
      onclick: () => {
        var showing = password.type === 'text'
        password.type = showing ? 'password' : 'text'
        ICT.util.mount(reveal, [icon(showing ? 'eye' : 'eyeOff', 16)])
        reveal.title = showing ? 'Show password' : 'Hide password'
      }
    }, [icon('eye', 16)])

    var capsHint = el('div.field__help.hidden', { text: 'Caps Lock is on — passwords are case-sensitive.' })

    function currentMode() {
      return mode
    }

    function clearOnType() {
      /* Typing means the user is dealing with the form now: drop stale notices
         and old errors so nothing is misread as the result of this attempt. */
      setNotice(null)
      errorNode.textContent = ''
    }
    ;[identifier, password].forEach((input) => input.addEventListener('input', clearOnType))
    password.addEventListener('keyup', (event) => {
      if (event.getModifierState) capsHint.classList.toggle('hidden', !event.getModifierState('CapsLock'))
    })

    var submit = el('button.btn.btn--primary.btn--block', { type: 'submit', text: 'Sign in' })

    var form = el('form.login-card', [
      el('h2', { text: 'Sign in to your club' }),
      el('p.small.muted', { text: 'Use the account the club patron or the executive committee created for you.' }),
      noticeNode,
      el('div.field', [el('label.field__label', { for: 'email' }, [el('span', { text: 'Username or email' })]), identifier, errorNode]),
      el('div.field', [
        el('label.field__label', { for: 'password' }, [el('span', { text: 'Password' })]),
        el('div.input-with-button', [password, reveal]),
        capsHint
      ]),
      el('div.field.hidden', { dataset: { register: 'name' } }, [
        el('label.field__label', [el('span', { text: 'Your full name' })]),
        el('input.input', { id: 'name', placeholder: 'e.g. Nakato Sarah' })
      ]),
      el('div.field.hidden', { dataset: { register: 'email' } }, [
        el('label.field__label', [el('span', { text: 'Email' })]),
        el('input.input', { id: 'signup-email', type: 'email', placeholder: 'you@school.ac.ug' })
      ]),
      submit,
      el('div.small.muted.center.mt-2', [
        el('span', { text: 'No account yet? ' }),
        el('a.link', {
          href: '#register',
          onclick: (event) => {
            event.preventDefault()
            toggleMode()
          }
        }, [el('b', { text: 'Register as a student' })])
      ]),
      el('div.small.muted.center.mt-1', [el('a.link', { href: '/verify', text: 'Verify a certificate →' })])
    ])

    function toggleMode() {
      mode = mode === 'login' ? 'register' : 'login'
      var registering = mode === 'register'
      wrap.querySelectorAll('[data-register]').forEach((node) => node.classList.toggle('hidden', !registering))
      submit.textContent = registering ? 'Create my account' : 'Sign in'
      form.querySelector('h2').textContent = registering ? 'Register as a student' : 'Sign in to your club'
      clearOnType()
    }

    form.addEventListener('submit', async (event) => {
      event.preventDefault()
      if (busy) return
      busy = true
      submit.disabled = true
      submit.textContent = mode === 'login' ? 'Signing in…' : 'Creating your account…'
      try {
        if (mode === 'login') {
          await ICT.store.signIn(identifier.value.trim(), password.value)
        } else {
          var name = document.getElementById('name').value.trim()
          var email = document.getElementById('signup-email').value.trim()
          if (!name || !email || !password.value) throw new Error('Name, email and password are required')
          await ICT.store.register({ name: name, email: email, password: password.value })
        }
        ICT.router.go('/', { replace: true, force: true })
      } catch (error) {
        var message = error.message || 'Unable to sign in'
        errorNode.textContent = /incorrect password/i.test(message)
          ? 'Incorrect password. Passwords are case-sensitive — check the capital letters, or use the eye button to see what you typed.'
          : message
      } finally {
          busy = false
        submit.disabled = false
        submit.textContent = mode === 'login' ? 'Sign in' : 'Create my account'
      }
    })

    wrap.appendChild(art)
    wrap.appendChild(el('div.login-form-wrap', form))
    ICT.util.mount(root, wrap)
    return wrap
  }

  ICT.views = ICT.views || {}
  ICT.views.login = render
})()
