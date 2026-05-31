import { useState, useEffect, FormEvent } from 'react';
import { api } from '../services/api';
import { Goal } from '../types';

const ICONS = ['🎯', '💰', '✈️', '🏠', '🚗', '💻', '🎓', '🏥', '🛡️', '👶', '💍', '🏖️'];

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showContributeModal, setShowContributeModal] = useState(false);
  const [contributeGoalId, setContributeGoalId] = useState<string | null>(null);
  const [contributeAmount, setContributeAmount] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [savedAmount, setSavedAmount] = useState('');
  const [deadline, setDeadline] = useState('');
  const [icon, setIcon] = useState('🎯');
  const [category, setCategory] = useState('general');

  useEffect(() => { loadGoals(); }, []);

  async function loadGoals() {
    try { setGoals(await api.goals.list()); } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      const data = { name, targetAmount: parseFloat(targetAmount), savedAmount: parseFloat(savedAmount) || 0, deadline, icon, category };
      if (editId) { await api.goals.update(editId, data); }
      else { await api.goals.create(data); }
      setShowModal(false); resetForm(); loadGoals();
    } catch (err: any) { alert(err.message); }
  }

  async function handleContribute(e: FormEvent) {
    e.preventDefault();
    if (!contributeGoalId) return;
    try {
      const goal = goals.find(g => g.id === contributeGoalId);
      if (!goal) return;
      const newSaved = Math.min(goal.targetAmount, (goal.savedAmount || 0) + parseFloat(contributeAmount));
      await api.goals.update(contributeGoalId, { savedAmount: newSaved });
      setShowContributeModal(false); setContributeGoalId(null); setContributeAmount(''); loadGoals();
    } catch (err: any) { alert(err.message); }
  }

  async function deleteGoal(id: string) {
    if (!confirm('¿Eliminar esta meta?')) return;
    await api.goals.delete(id); loadGoals();
  }

  function openEdit(goal: Goal) {
    setEditId(goal.id); setName(goal.name); setTargetAmount(String(goal.targetAmount));
    setSavedAmount(String(goal.savedAmount || 0)); setDeadline(goal.deadline || '');
    setIcon(goal.icon || '🎯'); setCategory(goal.category || 'general');
    setShowModal(true);
  }

  function resetForm() {
    setEditId(null); setName(''); setTargetAmount(''); setSavedAmount('');
    setDeadline(''); setIcon('🎯'); setCategory('general');
  }

  if (loading) return <div className="flex" style={{justifyContent:'center',padding:80}}><div className="spinner" /></div>;

  return (
    <div className="fade-in">
      <div className="flex-between mb-20">
        <h2 style={{margin:0}}>Metas Financieras</h2>
        <button className="btn btn-primary btn-sm" onClick={() => { resetForm(); setShowModal(true); }}>+ Nueva Meta</button>
      </div>

      {goals.length > 0 ? (
        <div className="goals-grid">
          {goals.map(g => {
            const pct = g.targetAmount > 0 ? Math.min(100, ((g.savedAmount || 0) / g.targetAmount) * 100) : 0;
            const remaining = g.targetAmount - (g.savedAmount || 0);
            const deadlineDate = g.deadline ? new Date(g.deadline).toLocaleDateString('es-MX', { day:'numeric', month:'short', year:'numeric' }) : 'Sin fecha';
            return (
              <div key={g.id} className="goal-card">
                <div className="goal-icon">{g.icon || '🎯'}</div>
                <div className="goal-name">{g.name}</div>
                <div className="text-muted" style={{fontSize:12,marginBottom:14}}>Meta: {deadlineDate}</div>
                <div className="goal-amounts">
                  <div className="goal-saved">${(g.savedAmount || 0).toLocaleString()}</div>
                  <div className="goal-target">de ${g.targetAmount.toLocaleString()}</div>
                </div>
                <div className="progress-container">
                  <div className="progress-bar">
                    <div className="progress-fill" style={{width:`${pct}%`}} />
                  </div>
                </div>
                <div className="flex-between" style={{marginBottom:12}}>
                  <span className="goal-percent">{pct.toFixed(0)}% completado</span>
                  <span className="text-muted" style={{fontSize:12}}>Faltan ${remaining.toLocaleString()}</span>
                </div>
                <div className="goal-actions">
                  <button className="btn btn-primary btn-sm" onClick={() => { setContributeGoalId(g.id); setContributeAmount(''); setShowContributeModal(true); }}>Ahorrar</button>
                  <button className="btn btn-secondary btn-sm" onClick={() => openEdit(g)}>Editar</button>
                  <button className="btn btn-danger btn-sm" onClick={() => deleteGoal(g.id)}>✕</button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-icon">★</div>
          <h3>Sin metas registradas</h3>
          <p>Define metas financieras para mantener el enfoque</p>
          <button className="btn btn-primary" onClick={() => { resetForm(); setShowModal(true); }}>+ Crear Meta</button>
        </div>
      )}

      {/* Contribute Modal */}
      {showContributeModal && (
        <div className="modal-overlay open" onClick={(e) => { if (e.target === e.currentTarget) setShowContributeModal(false); }}>
          <div className="modal-content">
            <div className="modal-header">
              <h2>Aportar a Meta</h2>
              <button className="modal-close" onClick={() => setShowContributeModal(false)}>✕</button>
            </div>
            <form onSubmit={handleContribute}>
              <div className="form-group">
                <label>Monto a ahorrar</label>
                <input type="number" value={contributeAmount} onChange={e => setContributeAmount(e.target.value)} placeholder="0.00" step="0.01" required />
              </div>
              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowContributeModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Aportar</button>
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
              <h2>{editId ? 'Editar' : 'Nueva'} Meta</h2>
              <button className="modal-close" onClick={() => { setShowModal(false); resetForm(); }}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label>Nombre</label>
                  <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Viaje a Japón" required />
                </div>
                <div className="form-group">
                  <label>Monto objetivo</label>
                  <input type="number" value={targetAmount} onChange={e => setTargetAmount(e.target.value)} placeholder="0.00" step="0.01" required />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Ya ahorrado</label>
                  <input type="number" value={savedAmount} onChange={e => setSavedAmount(e.target.value)} placeholder="0" step="0.01" />
                </div>
                <div className="form-group">
                  <label>Fecha límite</label>
                  <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} />
                </div>
              </div>
              <div className="form-group">
                <label>Icono</label>
                <div className="flex gap-8" style={{flexWrap:'wrap'}}>
                  {ICONS.map(ic => (
                    <span key={ic} onClick={() => setIcon(ic)} style={{
                      fontSize:24, cursor:'pointer', padding:'6px 8px', borderRadius:'var(--radius-sm)',
                      background: icon === ic ? 'var(--gold-dim)' : 'var(--bg-card)',
                      border: icon === ic ? '1px solid var(--gold)' : '1px solid transparent',
                    }}>{ic}</span>
                  ))}
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
