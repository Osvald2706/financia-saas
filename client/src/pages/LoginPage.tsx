import { useState, FormEvent } from 'react';
import { useAuth } from '../services/AuthContext';

export default function LoginPage() {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isRegister) {
        await register(email, password, name);
      } else {
        await login(email, password);
      }
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card fade-in">
        <div className="logo">F</div>
        <h1>Financia</h1>
        <p>{isRegister ? 'Crea tu cuenta gratuita' : 'Inicia sesión en tu cuenta'}</p>
        {error && <div className="error">{error}</div>}
        <form onSubmit={handleSubmit}>
          {isRegister && (
            <div className="form-group">
              <label>Nombre</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Tu nombre" required />
            </div>
          )}
          <div className="form-group">
            <label>Correo electrónico</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="ejemplo@correo.com" required />
          </div>
          <div className="form-group">
            <label>Contraseña</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" minLength={6} required />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Cargando...' : isRegister ? 'Crear Cuenta' : 'Iniciar Sesión'}
          </button>
        </form>
        <div className="switch">
          {isRegister ? '¿Ya tienes cuenta?' : '¿No tienes cuenta?'}{' '}
          <a onClick={() => { setIsRegister(!isRegister); setError(''); }}>{isRegister ? 'Inicia sesión' : 'Regístrate'}</a>
        </div>
      </div>
    </div>
  );
}
