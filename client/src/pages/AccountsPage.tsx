import { useState, useEffect, FormEvent } from 'react';
import { api } from '../services/api';
import { Account } from '../types';

const COLORS = ['#00c853','#2979ff','#ffd700','#7c4dff','#ff1744','#00bcd4','#ff9100','#e91e63'];

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [type, setType] = useState('checking');
  const [balance, setBalance] = useState('');

  useEffect(() => { loadAccounts(); }, []);

  async function loadAccounts() {
    try { setAccounts(await api.accounts.list()); } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      if (editId) {
        await api.accounts.update(editId, { name, type, balance: parseFloat(balance) || 0 });
      } else {
        await api.accounts.create({ name, type, balance: parseFloat(balance) || 0 });
      }
      setShowModal(false);
      resetForm();
      loadAccounts();
    } catch (err: any) { alert(err.message); }
  }

  async function deleteAccount(id: string) {
    if (!confirm('¿Eliminar esta cuenta y sus movimientos?')) return;
    await api.accounts.delete(id);
    loadAccounts();
  }

  function openEdit(acc: Account) {
    setEditId(acc.id); setName(acc.name); setType(acc.type); setBalance(String(acc.balance));
    setShowModal(true);
  }

  function resetForm() { setEditId(null); setName(''); setType('checking'); setBalance(''); }

  if (loading) return <div className="flex" style={{justifyContent:'center',padding:80}}><div className="spinner" /></div>;

  return (
    <div className="fade-in">
      <div className="flex-between mb-20">
        <h2 style={{margin:0}}>Tus Cuentas</h2>
        <button className="btn btn-primary btn-sm" onClick={() => { resetForm(); setShowModal(true); }}>+ Nueva Cuenta</button>
      </div>
      {accounts.length > 0 ? (
        <div className="accounts-grid">
          {accounts.map((acc, i) => {
            const color = acc.color || COLORS[i % COLORS.length];
            return (
              <div key={acc.id} className="account-card" onClick={() => openEdit(acc)} style={{cursor:'pointer'}}>
                <div className="accent-bar" style={{background: color}} />
                <div className="acc-header">
                  <div>
                    <div className="acc-name">{acc.name}</div>
                    <div className="acc-type">{acc.type}</div>
                  </div>
                </div>
                <div className="acc-balance">${(acc.balance || 0).toLocaleString()}</div>
                <div className="acc-movements">Saldo actual</div>
                <button className="btn btn-danger btn-sm" style={{position:'absolute',top:16,right:16,width:28,height:28,padding:0,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center'}}
                  onClick={(e) => { e.stopPropagation(); deleteAccount(acc.id); }}>✕</button>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-icon">🏦</div>
          <h3>No hay cuentas</h3>
          <p>Crea tu primera cuenta financiera</p>
          <button className="btn btn-primary" onClick={() => { resetForm(); setShowModal(true); }}>+ Crear Cuenta</button>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay open" onClick={(e) => { if (e.target === e.currentTarget) { setShowModal(false); resetForm(); } }}>
          <div className="modal-content">
            <div className="modal-header">
              <h2>{editId ? 'Editar' : 'Nueva'} Cuenta</h2>
              <button className="modal-close" onClick={() => { setShowModal(false); resetForm(); }}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Nombre de la cuenta</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Ej: BBVA, Nu, Efectivo" required />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Tipo</label>
                  <select value={type} onChange={e => setType(e.target.value)}>
                    <option value="checking">Cuenta corriente</option>
                    <option value="savings">Ahorro</option>
                    <option value="credit">Tarjeta crédito</option>
                    <option value="cash">Efectivo</option>
                    <option value="investment">Inversión</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Saldo actual</label>
                  <input type="number" value={balance} onChange={e => setBalance(e.target.value)} placeholder="0" step="0.01" required />
                </div>
              </div>
              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => { setShowModal(false); resetForm(); }}>Cancelar</button>
                <button type="submit" className="btn btn-primary">{editId ? 'Guardar' : 'Crear'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
