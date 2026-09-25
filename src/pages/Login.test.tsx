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
  const signUpWithPassword = vi.fn().mockResolvedValue(true)
  useAuthMock.mockReturnValue({
    signInWithPassword,
    signUpWithPassword,
    user: null,
    isLoading: false,
    configurationError: null,
  })
  // Import after env stubs so the module-level demo constants pick them up.
  const { default: Login } = await import('./Login')
  render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>,
  )
  return { signInWithPassword, signUpWithPassword }
}

describe('Login page', () => {
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

  it('lets a new subcontractor create an account and tells them to confirm their email', async () => {
    vi.stubEnv('VITE_DEMO_EMAIL', '')
    const user = userEvent.setup()
    const { signUpWithPassword } = await renderLogin()

    await user.click(screen.getByRole('button', { name: 'Create an account' }))
    await user.type(screen.getByLabelText('Email address'), 'sipho@mthembu.co.za')
    await user.type(screen.getByLabelText('Password'), 'long-enough-pw')
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    await waitFor(() => expect(signUpWithPassword).toHaveBeenCalledWith('sipho@mthembu.co.za', 'long-enough-pw'))
    expect(await screen.findByText(/Check sipho@mthembu.co.za for a confirmation link/)).toBeInTheDocument()
  })
})
