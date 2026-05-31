import { useState, useEffect, FormEvent } from 'react';
import { api } from '../services/api';
import { Debt } from '../types';

export default function DebtsPage() {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [payDebtId, setPayDebtId] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [creditor, setCreditor] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [paidAmount, setPaidAmount] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [category, setCategory] = useState('other');
  const [notes, setNotes] = useState('');

  useEffect(() => { loadDebts(); }, []);

  async function loadDebts() {
    try { setDebts(await api.debts.list()); } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      const data = { name, creditor, totalAmount: parseFloat(totalAmount), paidAmount: parseFloat(paidAmount) || 0, interestRate: parseFloat(interestRate) || 0, dueDate, category, notes };
      if (editId) { await api.debts.update(editId, data); }
      else { await api.debts.create(data); }
      setShowModal(false); resetForm(); loadDebts();
    } catch (err: any) { alert(err.message); }
  }

  async function handlePay(e: FormEvent) {
    e.preventDefault();
    if (!payDebtId) return;
    try {
      const debt = debts.find(d => d.id === payDebtId);
      if (!debt) return;
      const newPaid = Math.min(debt.totalAmount, (debt.paidAmount || 0) + parseFloat(payAmount));
      await api.debts.update(payDebtId, { paidAmount: newPaid });
      setShowPayModal(false); setPayDebtId(null); setPayAmount(''); loadDebts();
    } catch (err: any) { alert(err.message); }
  }

  async function deleteDebt(id: string) {
    if (!confirm('¿Eliminar esta deuda?')) return;
    await api.debts.delete(id); loadDebts();
  }

  function openEdit(debt: Debt) {
    setEditId(debt.id); setName(debt.name); setCreditor(debt.creditor || '');
    setTotalAmount(String(debt.totalAmount)); setPaidAmount(String(debt.paidAmount || 0));
    setInterestRate(String(debt.interestRate || 0)); setDueDate(debt.dueDate || '');
    setCategory(debt.category || 'other'); setNotes(debt.notes || '');
    setShowModal(true);
  }

  function resetForm() {
    setEditId(null); setName(''); setCreditor(''); setTotalAmount(''); setPaidAmount('');
    setInterestRate(''); setDueDate(''); setCategory('other'); setNotes('');
  }

  const totalDebt = debts.reduce((s, d) => s + d.totalAmount, 0);
  const totalPaid = debts.reduce((s, d) => s + (d.paidAmount || 0), 0);
  const remaining = totalDebt - totalPaid;

  if (loading) return <div className="flex" style={{justifyContent:'center',padding:80}}><div className="spinner" /></div>;

  return (
    <div className="fade-in">
      <div className="flex-between mb-20">
        <div>
          <h2 style={{margin:0}}>Control de Deudas</h2>
          <div className="text-secondary" style={{fontSize:13,marginTop:4}}>
            Total: <span className="text-red">${remaining.toLocaleString()}</span> restantes de <span className="text-muted">${totalDebt.toLocaleString()}</span>
          </div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => { resetForm(); setShowModal(true); }}>+ Nueva Deuda</button>
      </div>

      {debts.length > 0 ? (
        <div className="debts-grid">
          {debts.map(d => {
            const pct = d.totalAmount > 0 ? Math.min(100, ((d.paidAmount || 0) / d.totalAmount) * 100) : 0;
            const rem = d.totalAmount - (d.paidAmount || 0);
            const pressure = d.totalAmount > 50000 ? 'high' : d.totalAmount > 10000 ? 'medium' : 'low';
            const pressureLabel: Record<string,string> = { high: 'Alta', medium: 'Media', low: 'Baja' };
            const due = d.dueDate ? new Date(d.dueDate).toLocaleDateString('es-MX', { day:'numeric', month:'short', year:'numeric' }) : 'Sin fecha';
            return (
              <div key={d.id} className="debt-card">
                <div className="debt-header">
                  <div>
                    <div className="debt-name">{d.name}</div>
                    <div className="debt-creditor">{d.creditor || '—'}</div>
                  </div>
                  <span className={`category-tag expense credit-badge ${pressure}`}>Presión {pressureLabel[pressure]}</span>
                </div>
                <div className="debt-amounts">
                  <div className="debt-total">${rem.toLocaleString()}</div>
                  <div className="debt-paid">Pagado: <span>${(d.paidAmount || 0).toLocaleString()}</span></div>
                </div>
                <div className="progress-container">
                  <div className="progress-bar">
                    <div className="progress-fill" style={{width:`${pct}%`,background:pct >= 80 ? 'var(--green)' : pct >= 50 ? 'var(--gold)' : 'var(--red)'}} />
                  </div>
                </div>
                <div className="debt-info">
                  <span>{pct.toFixed(0)}% liquidado</span>
                  <span>Vence: {due}</span>
                </div>
                <div className="debt-actions">
                  <button className="btn btn-primary btn-sm" onClick={() => { setPayDebtId(d.id); setPayAmount(''); setShowPayModal(true); }}>Pagar</button>
                  <button className="btn btn-secondary btn-sm" onClick={() => openEdit(d)}>Editar</button>
                  <button className="btn btn-danger btn-sm" onClick={() => deleteDebt(d.id)}>✕</button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-icon">⊘</div>
          <h3>Sin deudas registradas</h3>
          <p>Registra tus deudas para controlarlas</p>
          <button className="btn btn-primary" onClick={() => { resetForm(); setShowModal(true); }}>+ Registrar Deuda</button>
        </div>
      )}

      {/* Pay Modal */}
      {showPayModal && (
        <div className="modal-overlay open" onClick={(e) => { if (e.target === e.currentTarget) { setShowPayModal(false); } }}>
          <div className="modal-content">
            <div className="modal-header">
              <h2>Registrar Pago</h2>
              <button className="modal-close" onClick={() => setShowPayModal(false)}>✕</button>
            </div>
            <form onSubmit={handlePay}>
              <div className="form-group">
                <label>Monto a pagar</label>
                <input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} placeholder="0.00" step="0.01" required />
              </div>
              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowPayModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Registrar Pago</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay open" onClick={(e) => { if (e.target === e.currentTarget) { setShowModal(false); resetForm(); } }}>
          <div className="modal-content">
            <div className="modal-header">
              <h2>{editId ? 'Editar' : 'Nueva'} Deuda</h2>
              <button className="modal-close" onClick={() => { setShowModal(false); resetForm(); }}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label>Nombre</label>
                  <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Tarjeta de crédito" required />
                </div>
                <div className="form-group">
                  <label>Monto total</label>
                  <input type="number" value={totalAmount} onChange={e => setTotalAmount(e.target.value)} placeholder="0.00" step="0.01" required />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Acreedor</label>
                  <input type="text" value={creditor} onChange={e => setCreditor(e.target.value)} placeholder="Ej: BBVA, Kueski" />
                </div>
                <div className="form-group">
                  <label>Tasa de interés (%)</label>
                  <input type="number" value={interestRate} onChange={e => setInterestRate(e.target.value)} placeholder="0" step="0.1" />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Ya pagado</label>
                  <input type="number" value={paidAmount} onChange={e => setPaidAmount(e.target.value)} placeholder="0" step="0.01" />
                </div>
                <div className="form-group">
                  <label>Fecha de vencimiento</label>
                  <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
                </div>
              </div>
              <div className="form-group">
                <label>Notas</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notas adicionales" />
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
