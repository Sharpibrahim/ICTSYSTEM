/* ==========================================================================
   boot.js — where the app starts.

   1. if a session was left behind, fetch the schema and the settings
   2. paint whatever address the browser is on
   3. hand every API failure it can recover from to the sign-in screen
   ========================================================================== */
(function () {
  var ICT = window.ICT = window.ICT || {}

  async function boot() {
    var root = document.getElementById('app')

    try {
      if (ICT.session.getToken()) {
        await ICT.store.boot()
      }
    } catch (error) {
      /* The schema could not be fetched. If that is because the session is
         gone, net.js has already cleared it and left a notice for the sign-in
         screen; anything else is reported there too rather than as an error
         page. */
      if (window.console && console.error && error && error.status !== 401) console.error(error)
    }

    try {
      await ICT.nav.render()
    } catch (error) {
      ICT.mount(root, ICT.widgets.notice('The app could not start. ' + (error && error.message ? error.message : ''), 'error'))
      if (window.console && console.error) console.error(error)
    }

    /* Any screen can ask for the schema later (a refresh, a new module). */
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden && ICT.session.getToken() && !ICT.store.state.loaded) {
        ICT.store.boot().then(ICT.nav.render).catch(function () { /* stay where we are */ })
      }
    })
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot)
  else boot()
})()
