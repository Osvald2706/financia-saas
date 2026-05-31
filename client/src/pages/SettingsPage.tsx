import { useState, useEffect, FormEvent } from 'react';
import { api } from '../services/api';
import { useAuth } from '../services/AuthContext';

export default function SettingsPage() {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState('MXN');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setCurrency(user.currency || 'MXN');
    }
  }, [user]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      await api.auth.updateProfile({ name, currency });
      setMessage('✅ Configuración guardada exitosamente');
    } catch (err: any) {
      setMessage('❌ Error al guardar: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fade-in">
      <div className="ai-section" style={{maxWidth:560}}>
        <h3>⚙️ Configuración de Perfil</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Nombre</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Tu nombre" required />
          </div>
          <div className="form-group">
            <label>Moneda</label>
            <select value={currency} onChange={e => setCurrency(e.target.value)}>
              <option value="MXN">MXN - Peso Mexicano</option>
              <option value="USD">USD - Dólar Americano</option>
              <option value="EUR">EUR - Euro</option>
              <option value="COP">COP - Peso Colombiano</option>
              <option value="ARS">ARS - Peso Argentino</option>
              <option value="CLP">CLP - Peso Chileno</option>
              <option value="PEN">PEN - Sol Peruano</option>
            </select>
          </div>
          <div className="form-group">
            <label>Correo electrónico</label>
            <input type="email" value={user?.email || ''} disabled style={{opacity:0.5}} />
            <div className="text-muted" style={{fontSize:11,marginTop:4}}>El correo no se puede cambiar</div>
          </div>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Guardando...' : '💾 Guardar Cambios'}
          </button>
          {message && <p style={{marginTop:16,fontSize:14}}>{message}</p>}
        </form>
      </div>

      <div className="ai-section" style={{maxWidth:560}}>
        <h3>ℹ️ Información de la Cuenta</h3>
        <div className="text-secondary" style={{fontSize:13,lineHeight:2}}>
          <p>Miembro desde: {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('es-MX', { year:'numeric', month:'long', day:'numeric' }) : '—'}</p>
          <p>Versión: 1.0.0</p>
          <p>Financia © {new Date().getFullYear()} — Todos los derechos reservados</p>
        </div>
      </div>

      <div className="ai-section" style={{maxWidth:560}}>
        <h3>📱 Descarga la App</h3>
        <p className="text-secondary" style={{fontSize:13,marginBottom:12}}>
          Financia es una Progressive Web App (PWA). Puedes instalarla en tu dispositivo para usarla como una aplicación nativa.
        </p>
        <div className="text-secondary" style={{fontSize:13}}>
          <p>• <strong>Android:</strong> Abre con Chrome → Menú → "Instalar aplicación"</p>
          <p>• <strong>iPhone:</strong> Abre con Safari → Compartir → "Agregar a pantalla de inicio"</p>
          <p>• <strong>Windows/Mac:</strong> Abre con Chrome/Edge → icono de instalar en la barra de direcciones</p>
        </div>
      </div>
    </div>
  );
}
