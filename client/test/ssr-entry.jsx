/**
 * Entry used by the smoke test: builds the whole app for a given route so it
 * can be rendered in a jsdom environment against the real API.
 */
import React from 'react'
import { MemoryRouter } from 'react-router-dom'
import App from '../src/App'
import { AuthProvider } from '../src/auth'
import { ToastProvider } from '../src/components/ui'

export function renderAt(path) {
  return (
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </AuthProvider>
    </MemoryRouter>
  )
}

export { React }
