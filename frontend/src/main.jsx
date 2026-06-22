import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import Login from './Login.jsx'

function AuthWrapper() {
  const [isAuthenticated, setIsAuthenticated] = useState(
    sessionStorage.getItem('auth') === 'true'
  );

  const handleLogin = () => {
    sessionStorage.setItem('auth', 'true');
    setIsAuthenticated(true);
  };

  return isAuthenticated ? <App /> : <Login onLogin={handleLogin} />;
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthWrapper />
  </StrictMode>,
)
