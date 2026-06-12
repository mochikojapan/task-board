import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api, ApiError } from '../api';
import { LoginPage } from './LoginPage';

// Mock only the network calls; keep ApiError (and everything else) real so
// `instanceof ApiError` checks in the component still work.
vi.mock('../api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api')>();
  return {
    ...actual,
    api: { ...actual.api, login: vi.fn() },
  };
});

const mockedLogin = vi.mocked(api.login);

describe('LoginPage', () => {
  beforeEach(() => {
    mockedLogin.mockReset();
  });

  it('renders the login form', () => {
    render(<LoginPage onLogin={vi.fn()} />);

    expect(screen.getByRole('heading', { name: /task board/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('shows the inline error when login fails with bad credentials', async () => {
    mockedLogin.mockRejectedValueOnce(
      new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid email or password'),
    );
    const onLogin = vi.fn();

    render(<LoginPage onLogin={onLogin} />);

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'demo@taskboard.dev' },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'wrong-password' },
    });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Invalid email or password');
    expect(mockedLogin).toHaveBeenCalledWith('demo@taskboard.dev', 'wrong-password');
    expect(onLogin).not.toHaveBeenCalled();
  });
});
