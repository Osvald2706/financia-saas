import { useState, useEffect, FormEvent } from 'react';
import { api } from '../services/api';
import { Transaction, Account } from '../types';

const INCOME_CATEGORIES = ['Salario', 'Ventas', 'Freelance', 'Negocios', 'Inversiones', 'Transferencia', 'Otro'];
const EXPENSE_CATEGORIES = ['Comida', 'Transporte', 'Gimnasio', 'Entretenimiento', 'Servicios', 'Deudas', 'Compras', 'Salud', 'Educación', 'Suscripciones', 'Renta', 'Otro'];
const ALL_CATEGORIES = [...new Set([...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES])];

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');
  const [filterAccount, setFilterAccount] = useState('all');
  const [filterMonth, setFilterMonth] = useState(new Date().toISOString().slice(0, 7));
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [formType, setFormType] = useState<'income' | 'expense'>('income');
  const [formCategory, setFormCategory] = useState('Salario');
  const [formAmount, setFormAmount] = useState('');
  const [formAccount, setFormAccount] = useState('');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formNote, setFormNote] = useState('');

  useEffect(() => { loadAccounts(); }, []);

  async function loadAccounts() {
    try {
      const accs = await api.accounts.list();
      setAccounts(accs);
      loadTransactions();
    } catch { setLoading(false); }
  }

  async function loadTransactions() {
    try {
      const params: Record<string, string> = {};
      if (filterType !== 'all') params.type = filterType;
      if (filterAccount !== 'all') params.accountId = filterAccount;
      if (filterMonth) {
        params.startDate = filterMonth + '-01';
        const lastDay = new Date(parseInt(filterMonth.split('-')[0]), parseInt(filterMonth.split('-')[1]), 0).getDate();
        params.endDate = filterMonth + '-' + String(lastDay).padStart(2, '0');
      }
      const res = await api.transactions.list(params);
      setTransactions(res.transactions);
      setTotal(res.total);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  useEffect(() => { loadTransactions(); }, [filterType, filterAccount, filterMonth]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      const data = { type: formType, category: formCategory, amount: Math.abs(parseFloat(formAmount)), accountId: formAccount, date: formDate, note: formNote };
      if (editId) { await api.transactions.update(editId, data); }
      else { await api.transactions.create(data); }
      setShowModal(false);
      resetForm();
      loadTransactions();
    } catch (err: any) { alert(err.message); }
  }

  async function deleteTransaction(id: string) {
    if (!confirm('¿Eliminar este movimiento?')) return;
    await api.transactions.delete(id);
    loadTransactions();
  }

  function openEdit(txn: Transaction) {
    setEditId(txn.id);
    setFormType(txn.type);
    setFormCategory(txn.category);
    setFormAmount(String(txn.amount));
    setFormAccount(txn.accountId);
    setFormDate(txn.date);
    setFormNote(txn.note || '');
    setShowModal(true);
  }

  function resetForm() {
    setEditId(null); setFormType('income'); setFormCategory('Salario');
    setFormAmount(''); setFormAccount(''); setFormDate(new Date().toISOString().split('T')[0]); setFormNote('');
  }

  const categories = formType === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  return (
    <div className="fade-in">
      <div className="flex-between mb-20" style={{flexWrap:'wrap',gap:12}}>
        <button className="btn btn-primary btn-sm" onClick={() => { resetForm(); if (accounts.length) setFormAccount(accounts[0].id); setShowModal(true); }}>+ Nuevo Movimiento</button>
        <div className="flex gap-8" style={{flexWrap:'wrap'}}>
          <select value={filterType} onChange={e => setFilterType(e.target.value)} style={{background:'var(--bg-card)',border:'1px solid var(--border-color)',color:'var(--text-primary)',padding:'8px 12px',borderRadius:'var(--radius-sm)',fontSize:13}}>
            <option value="all">Todos</option><option value="income">Ingresos</option><option value="expense">Gastos</option>
          </select>
          <select value={filterAccount} onChange={e => setFilterAccount(e.target.value)} style={{background:'var(--bg-card)',border:'1px solid var(--border-color)',color:'var(--text-primary)',padding:'8px 12px',borderRadius:'var(--radius-sm)',fontSize:13}}>
            <option value="all">Todas las cuentas</option>
            {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <input type="month" value={filterMonth} onChange={e => setFilterMonth(e.target.value)}
            style={{background:'var(--bg-card)',border:'1px solid var(--border-color)',color:'var(--text-primary)',padding:'8px 12px',borderRadius:'var(--radius-sm)',fontSize:13}} />
        </div>
      </div>

      {loading ? <div className="flex" style={{justifyContent:'center',padding:40}}><div className="spinner" /></div> :
        transactions.length > 0 ? (
          <div className="transaction-list">
            {transactions.map(t => (
              <div key={t.id} className="transaction-item" onClick={() => openEdit(t)} style={{cursor:'pointer'}}>
                <div className={`txn-icon ${t.type}`}>{t.type === 'income' ? '↓' : '↑'}</div>
                <div className="txn-info">
                  <div className="txn-category">{t.category}</div>
                  <div className="txn-details">
                    {t.accountName || t.account_name || '—'} · {new Date(t.date).toLocaleDateString('es-MX', { day:'numeric', month:'short', year:'numeric' })}
                    {t.note && ` · ${t.note}`}
                  </div>
                </div>
                <div className={`txn-amount ${t.type === 'income' ? 'text-green' : 'text-red'}`}>
                  {t.type === 'income' ? '+' : '-'}${Math.abs(t.amount).toLocaleString()}
                </div>
                <button className="btn btn-danger btn-sm" style={{width:28,height:28,padding:0,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center'}}
                  onClick={(e) => { e.stopPropagation(); deleteTransaction(t.id); }}>✕</button>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <h3>Sin movimientos</h3>
            <p>Registra tu primer ingreso o gasto</p>
          </div>
        )
      }

      {showModal && (
        <div className="modal-overlay open" onClick={(e) => { if (e.target === e.currentTarget) { setShowModal(false); resetForm(); } }}>
          <div className="modal-content">
            <div className="modal-header">
              <h2>{editId ? 'Editar' : 'Nuevo'} Movimiento</h2>
              <button className="modal-close" onClick={() => { setShowModal(false); resetForm(); }}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label>Tipo</label>
                  <select value={formType} onChange={e => { setFormType(e.target.value as any); setFormCategory(e.target.value === 'income' ? 'Salario' : 'Comida'); }} disabled={!!editId}>
                    <option value="income">Ingreso</option><option value="expense">Gasto</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Monto</label>
                  <input type="number" value={formAmount} onChange={e => setFormAmount(e.target.value)} placeholder="0.00" step="0.01" required />
                </div>
              </div>
              <div className="form-group">
                <label>Categoría</label>
                <select value={formCategory} onChange={e => setFormCategory(e.target.value)} required>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Cuenta</label>
                <select value={formAccount} onChange={e => setFormAccount(e.target.value)} required>
                  {accounts.length ? accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>) : <option value="">Sin cuentas</option>}
                </select>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Fecha</label>
                  <input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label>Nota (opcional)</label>
                  <input type="text" value={formNote} onChange={e => setFormNote(e.target.value)} placeholder="Descripción" />
                </div>
              </div>
              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => { setShowModal(false); resetForm(); }}>Cancelar</button>
                <button type="submit" className="btn btn-primary">{editId ? 'Guardar' : 'Registrar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
