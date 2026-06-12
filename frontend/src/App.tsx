import { useCallback, useEffect, useState } from 'react';
import { clearToken, getToken, setToken, setUnauthorizedHandler } from './api';
import { Board } from './components/Board';
import { LoginPage } from './components/LoginPage';

export default function App() {
  const [token, setTokenState] = useState<string | null>(() => getToken());

  const logout = useCallback(() => {
    clearToken();
    setTokenState(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(logout);
  }, [logout]);

  if (!token) {
    return (
      <LoginPage
        onLogin={(newToken) => {
          setToken(newToken);
          setTokenState(newToken);
        }}
      />
    );
  }

  return <Board onLogout={logout} />;
}
