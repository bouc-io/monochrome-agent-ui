import { render, screen } from '@testing-library/react';
import { BrowserRouter as Router } from 'react-router-dom';
import { vi } from 'vitest';
import { AuthProvider } from '../src/auth/authcontext';
import Login from '../src/pages/Login';

describe('Login page', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_IDENTITY_PROVIDER', 'stub');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('completes stub authentication and shows the development-mode notice', async () => {
    render(
      <Router>
        <AuthProvider>
          <Login />
        </AuthProvider>
      </Router>
    );

    // AuthProvider shows a spinner until the stub adapter finishes initializing
    expect(await screen.findByText(/Development Mode/i)).toBeInTheDocument();
    expect(screen.getByText(/Using stub authentication/i)).toBeInTheDocument();
  });
});
