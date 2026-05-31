import { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { cache } from '../services/cache';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend
} from 'recharts';

const COLORS = ['#00c853', '#2979ff', '#ffd700', '#ff1744', '#7c4dff', '#ff9100', '#00bcd4', '#e91e63'];

export default function DashboardPage() {
  const [dashboard, setDashboard] = useState<any>(null);
  const [health, setHealth] = useState<any>(null);
  const [predictions, setPredictions] = useState<any[]>([]);
  const [recentTxns, setRecentTxns] = useState<any[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<any[]>([]);
  const [monthlyTrends, setMonthlyTrends] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (health && canvasRef.current) drawHealthRing(canvasRef.current, health.score, health.color);
  }, [health]);

  async function loadData() {
    try {
      const cached = cache.get<any>('dashboard');
      if (cached) {
        setDashboard(cached.dashboard);
        setHealth(cached.health);
        setPredictions(cached.predictions);
        setRecentTxns(cached.recentTxns);
        setExpenseCategories(cached.expenseCategories);
        setMonthlyTrends(cached.monthlyTrends);
        setLoading(false);
      }

      const [dash, h, preds, txns, cats, trends] = await Promise.all([
        api.analytics.dashboard(),
        api.analytics.healthScore(),
        api.ai.predictions().catch(() => []),
        api.transactions.list({ limit: '5' }),
        api.analytics.expensesByCategory(),
        api.analytics.monthlyTrends().catch(() => []),
      ]);

      setDashboard(dash);
      setHealth(h);
      setPredictions(preds || []);
      setRecentTxns(txns.transactions || []);
      setExpenseCategories(cats || []);
      setMonthlyTrends(trends || []);

      cache.set('dashboard', {
        dashboard: dash, health: h, predictions: preds,
        recentTxns: txns.transactions || [], expenseCategories: cats || [], monthlyTrends: trends || [],
      });
    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  }

  function drawHealthRing(canvas: HTMLCanvasElement, score: number, color: string) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const cx = canvas.width / 2, cy = canvas.height / 2, r = 60, w = 10;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.lineWidth = w; ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * score / 100));
    ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.stroke();
    ctx.fillStyle = '#f0f0f5'; ctx.font = 'bold 32px -apple-system, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(score.toString(), cx, cy - 2);
    ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.font = '12px -apple-system, sans-serif';
    ctx.fillText('/100', cx + 28, cy + 6);
  }

  if (loading) return <div className="flex" style={{justifyContent:'center',padding:80}}><div className="spinner" /></div>;
  if (!dashboard) return <div className="empty-state"><div className="empty-icon">📊</div><h3>Bienvenido a Financia</h3><p>Comienza registrando tus cuentas y movimientos</p></div>;

  return (
    <div className="fade-in">
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-icon green">💰</div>
          <div className="metric-label">Balance Total</div>
          <div className="metric-value">${(dashboard.totalBalance || 0).toLocaleString()}</div>
          <div className="metric-sub text-secondary">Suma de todas tus cuentas</div>
        </div>
        <div className="metric-card">
          <div className="metric-icon blue">📊</div>
          <div className="metric-label">Patrimonio Neto</div>
          <div className="metric-value">${(dashboard.netWorth || 0).toLocaleString()}</div>
          <div className={`metric-sub ${(dashboard.netWorth || 0) >= 0 ? 'text-green' : 'text-red'}`}>
            {(dashboard.netWorth || 0) >= 0 ? 'Positivo' : 'Negativo'}
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-icon green">↓</div>
          <div className="metric-label">Ingresos Mensuales</div>
          <div className="metric-value text-green">+${(dashboard.monthlyIncome || 0).toLocaleString()}</div>
          <div className={`metric-sub ${(dashboard.incomeChange || 0) >= 0 ? 'text-green' : 'text-red'}`}>
            {(dashboard.incomeChange || 0) >= 0 ? '↑' : '↓'} {Math.abs(dashboard.incomeChange || 0).toFixed(0)}% vs mes anterior
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-icon red">↑</div>
          <div className="metric-label">Gastos Mensuales</div>
          <div className="metric-value text-red">-${(dashboard.monthlyExpenses || 0).toLocaleString()}</div>
          <div className={`metric-sub ${(dashboard.expenseChange || 0) <= 0 ? 'text-green' : 'text-red'}`}>
            {(dashboard.expenseChange || 0) <= 0 ? '↓' : '↑'} {Math.abs(dashboard.expenseChange || 0).toFixed(0)}% vs mes anterior
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-icon gold">★</div>
          <div className="metric-label">Ahorro Total</div>
          <div className="metric-value text-gold">${(dashboard.savings || 0).toLocaleString()}</div>
          <div className="metric-sub text-secondary">Histórico acumulado</div>
        </div>
        <div className="metric-card">
          <div className="metric-icon blue">%</div>
          <div className="metric-label">Tasa de Ahorro</div>
          <div className="metric-value">{(dashboard.savingsRate || 0).toFixed(0)}%</div>
          <div className={`metric-sub ${(dashboard.savingsRate || 0) >= 20 ? 'text-green' : (dashboard.savingsRate || 0) >= 10 ? 'text-gold' : 'text-red'}`}>
            {(dashboard.savingsRate || 0) >= 20 ? 'Excelente' : (dashboard.savingsRate || 0) >= 10 ? 'Buena' : 'Baja'}
          </div>
        </div>
        <div className="metric-card" onClick={() => navigate('/debts')} style={{cursor:'pointer'}}>
          <div className={`metric-icon ${(dashboard.activeDebts || 0) > 0 ? 'red' : 'green'}`}>
            {(dashboard.activeDebts || 0) > 0 ? '⊘' : '✓'}
          </div>
          <div className="metric-label">Deudas Activas</div>
          <div className={`metric-value ${(dashboard.activeDebts || 0) > 0 ? 'text-red' : 'text-green'}`}>
            {dashboard.activeDebts || 0}
          </div>
          <div className="metric-sub text-secondary">Total: ${(dashboard.totalDebt || 0).toLocaleString()}</div>
        </div>
        <div className="metric-card">
          <div className={`metric-icon ${(dashboard.cashflow || 0) >= 0 ? 'green' : 'red'}`}>
            {(dashboard.cashflow || 0) >= 0 ? '↗' : '↘'}
          </div>
          <div className="metric-label">Flujo de Efectivo</div>
          <div className={`metric-value ${(dashboard.cashflow || 0) >= 0 ? 'text-green' : 'text-red'}`}>
            {(dashboard.cashflow || 0) >= 0 ? '+' : '-'}${Math.abs(dashboard.cashflow || 0).toLocaleString()}
          </div>
          <div className="metric-sub text-secondary">Ingresos - Gastos</div>
        </div>
      </div>

      {health && (
        <div className="health-container">
          <div className="health-ring">
            <canvas ref={canvasRef} width="160" height="160" />
            <div className="health-label">Salud Financiera</div>
            <div className="health-sub" style={{color: health.color}}>{health.level} · {health.score}/100</div>
          </div>
          <div className="health-details">
            <div className="health-item">
              <div className="health-dot" style={{background: (dashboard.savingsRate || 0) >= 20 ? '#00c853' : '#ff9100'}} />
              <div className="health-info"><div className="hi-label">Ahorro</div><div className="hi-value">{(dashboard.savingsRate || 0).toFixed(0)}%</div></div>
            </div>
            <div className="health-item">
              <div className="health-dot" style={{background: (dashboard.totalDebt || 0) <= 0 ? '#00c853' : '#ff1744'}} />
              <div className="health-info"><div className="hi-label">Deuda</div><div className="hi-value">{(dashboard.totalDebt || 0) <= 0 ? 'Sin deuda' : '$' + (dashboard.totalDebt || 0).toLocaleString()}</div></div>
            </div>
            <div className="health-item">
              <div className="health-dot" style={{background: (dashboard.monthlyIncome || 0) > 0 ? '#00c853' : '#666'}} />
              <div className="health-info"><div className="hi-label">Ingresos</div><div className="hi-value">${(dashboard.monthlyIncome || 0).toLocaleString()}</div></div>
            </div>
            <div className="health-item">
              <div className="health-dot" style={{background: (dashboard.monthlyExpenses || 0) <= (dashboard.monthlyIncome || 0) ? '#2979ff' : '#ff1744'}} />
              <div className="health-info"><div className="hi-label">Gastos</div><div className="hi-value">${(dashboard.monthlyExpenses || 0).toLocaleString()}</div></div>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/analytics')}>Ver estadísticas completas</button>
          </div>
        </div>
      )}

      {monthlyTrends.length > 0 && (
        <>
          <div className="section-title">📈 Tendencia Mensual</div>
          <div className="chart-card mb-24">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={monthlyTrends}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="month" tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 12 }} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 12 }} />
                <Tooltip contentStyle={{ background: '#0b0b14', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, color: '#f0f0f5' }} />
                <Bar dataKey="income" name="Ingresos" fill="#00c853" radius={[4,4,0,0]} />
                <Bar dataKey="expenses" name="Gastos" fill="#ff1744" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {predictions.length > 0 && (
        <>
          <div className="section-title">🔮 Predicciones</div>
          <div className="predictions-grid">
            {predictions.map((p, i) => (
              <div key={i} className="prediction-card">
                <div className="pred-icon">{p.icon}</div>
                <div className="pred-text" dangerouslySetInnerHTML={{ __html: p.text }} />
              </div>
            ))}
          </div>
        </>
      )}

      <div className="section-title">↻ Movimientos Recientes</div>
      {recentTxns.length > 0 ? (
        <>
          <div className="transaction-list mb-20">
            {recentTxns.map((t: any) => (
              <div key={t.id} className="transaction-item">
                <div className={`txn-icon ${t.type}`}>{t.type === 'income' ? '↓' : '↑'}</div>
                <div className="txn-info">
                  <div className="txn-category">{t.category}</div>
                  <div className="txn-details">
                    {t.accountName || t.account_name || '—'} · {new Date(t.date).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                    {t.note && ` · ${t.note}`}
                  </div>
                </div>
                <div className={`txn-amount ${t.type === 'income' ? 'text-green' : 'text-red'}`}>
                  {t.type === 'income' ? '+' : '-'}${Math.abs(t.amount).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/transactions')}>Ver todos</button>
        </>
      ) : (
        <div className="empty-state">
          <div className="empty-icon">📋</div>
          <h3>No hay movimientos</h3>
          <p>Comienza registrando tus ingresos y gastos</p>
          <button className="btn btn-primary" onClick={() => navigate('/transactions')}>+ Nuevo Movimiento</button>
        </div>
      )}

      {expenseCategories.length > 0 && (
        <>
          <div className="section-title mt-24">📊 Gastos por Categoría</div>
          <div className="charts-grid">
            <div className="chart-card">
              <h3>Distribución de Gastos</h3>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={expenseCategories} dataKey="total" nameKey="category" cx="50%" cy="50%" outerRadius={80} label={({ category, percent }) => `${category} ${(percent * 100).toFixed(0)}%`}>
                    {expenseCategories.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="chart-card">
              <h3>Gastos por Categoría</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={expenseCategories} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 12 }} />
                  <YAxis dataKey="category" type="category" tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }} width={80} />
                  <Tooltip />
                  <Bar dataKey="total" fill="#ff1744" radius={[0,4,4,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
