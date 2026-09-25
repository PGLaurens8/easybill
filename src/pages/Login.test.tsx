import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const useAuthMock = vi.fn()

vi.mock('../context/AuthContext', () => ({
  useAuth: () => useAuthMock(),
}))

async function renderLogin() {
  const signInWithPassword = vi.fn().mockResolvedValue(undefined)
  useAuthMock.mockReturnValue({ signInWithPassword, user: null, isLoading: false, configurationError: null })
  // Import after env stubs so the module-level demo constants pick them up.
  const { default: Login } = await import('./Login')
  render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>,
  )
  return { signInWithPassword }
}

describe('Login page demo access', () => {
  beforeEach(() => {
    vi.resetModules()
    useAuthMock.mockReset()
  })
  afterEach(() => {
    cleanup()
    vi.unstubAllEnvs()
  })

  it('signs in to the demo account when demo credentials are configured', async () => {
    vi.stubEnv('VITE_DEMO_EMAIL', 'demo@quanteasy.app')
    vi.stubEnv('VITE_DEMO_PASSWORD', 'demo-pass')
    const user = userEvent.setup()
    const { signInWithPassword } = await renderLogin()

    await user.click(screen.getByRole('button', { name: 'Try the demo' }))

    await waitFor(() => expect(signInWithPassword).toHaveBeenCalledWith('demo@quanteasy.app', 'demo-pass'))
  })

  it('hides the demo button when no demo account is configured', async () => {
    vi.stubEnv('VITE_DEMO_EMAIL', '')
    vi.stubEnv('VITE_DEMO_PASSWORD', '')
    await renderLogin()

    expect(screen.queryByRole('button', { name: 'Try the demo' })).not.toBeInTheDocument()
  })
})
