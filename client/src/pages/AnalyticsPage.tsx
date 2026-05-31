import { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend, AreaChart, Area
} from 'recharts';

const COLORS = ['#00c853','#2979ff','#ffd700','#ff1744','#7c4dff','#ff9100','#00bcd4','#e91e63'];

export default function AnalyticsPage() {
  const [expenseCategories, setExpenseCategories] = useState<any[]>([]);
  const [incomeCategories, setIncomeCategories] = useState<any[]>([]);
  const [monthlyTrends, setMonthlyTrends] = useState<any[]>([]);
  const [health, setHealth] = useState<any>(null);
  const [dashboard, setDashboard] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.analytics.dashboard(),
      api.analytics.healthScore(),
      api.analytics.expensesByCategory(),
      api.analytics.incomeByCategory(),
      api.analytics.monthlyTrends().catch(() => []),
    ]).then(([dash, h, expCats, incCats, trends]) => {
      setDashboard(dash);
      setHealth(h);
      setExpenseCategories(expCats || []);
      setIncomeCategories(incCats || []);
      setMonthlyTrends(trends || []);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex" style={{justifyContent:'center',padding:80}}><div className="spinner" /></div>;

  const downloadPDF = async () => {
    try {
      const res = await api.reports.pdf();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `financia-report-${new Date().toISOString().split('T')[0]}.pdf`;
      a.click(); URL.revokeObjectURL(url);
    } catch { alert('Error al descargar PDF'); }
  };

  const downloadExcel = async () => {
    try {
      const res = await api.reports.excel();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `financia-data-${new Date().toISOString().split('T')[0]}.xlsx`;
      a.click(); URL.revokeObjectURL(url);
    } catch { alert('Error al descargar Excel'); }
  };

  return (
    <div className="fade-in">
      <div className="flex-between mb-20" style={{flexWrap:'wrap',gap:12}}>
        <h2 style={{margin:0}}>Reportes y Estadísticas</h2>
        <div className="flex gap-8">
          <button className="btn btn-secondary btn-sm" onClick={downloadPDF}>📄 Descargar PDF</button>
          <button className="btn btn-secondary btn-sm" onClick={downloadExcel}>📊 Descargar Excel</button>
        </div>
      </div>

      {health && (
        <div className="chart-card mb-20 flex-between" style={{alignItems:'center'}}>
          <div>
            <h3 style={{margin:0}}>Salud Financiera</h3>
            <div style={{fontSize:13,color:'var(--text-secondary)',marginTop:4}}>
              Nivel: <strong style={{color:health.color}}>{health.level} · {health.score}/100</strong>
            </div>
          </div>
          <div style={{width:80,height:80,position:'relative'}}>
            <canvas width="80" height="80" ref={el => {
              if (!el) return;
              const ctx = el.getContext('2d');
              if (!ctx) return;
              const cx = 40, cy = 40, r = 30, w = 5;
              ctx.clearRect(0,0,80,80);
              ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2);
              ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.lineWidth = w; ctx.stroke();
              ctx.beginPath(); ctx.arc(cx,cy,r,-Math.PI/2,-Math.PI/2+(Math.PI*2*health.score/100));
              ctx.strokeStyle = health.color; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.stroke();
              ctx.fillStyle = '#f0f0f5'; ctx.font = 'bold 16px sans-serif';
              ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
              ctx.fillText(health.score.toString(), cx, cy);
            }} />
          </div>
        </div>
      )}

      {monthlyTrends.length > 0 && (
        <div className="chart-card mb-20">
          <h3>Evolución Mensual</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={monthlyTrends}>
              <defs>
                <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#00c853" stopOpacity={0.3}/><stop offset="95%" stopColor="#00c853" stopOpacity={0}/></linearGradient>
                <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ff1744" stopOpacity={0.3}/><stop offset="95%" stopColor="#ff1744" stopOpacity={0}/></linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="month" tick={{fill:'rgba(255,255,255,0.35)',fontSize:12}} />
              <YAxis tick={{fill:'rgba(255,255,255,0.35)',fontSize:12}} />
              <Tooltip contentStyle={{background:'#0b0b14',border:'1px solid rgba(255,255,255,0.06)',borderRadius:8,color:'#f0f0f5'}} />
              <Area type="monotone" dataKey="income" name="Ingresos" stroke="#00c853" fill="url(#colorIncome)" strokeWidth={2} />
              <Area type="monotone" dataKey="expenses" name="Gastos" stroke="#ff1744" fill="url(#colorExpenses)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="charts-grid">
        {expenseCategories.length > 0 && (
          <div className="chart-card">
            <h3>Gastos por Categoría</h3>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={expenseCategories} dataKey="total" nameKey="category" cx="50%" cy="50%" outerRadius={90} label={({category,percent}) => `${(percent*100).toFixed(0)}%`}>
                  {expenseCategories.map((_:any,i:number) => <Cell key={i} fill={COLORS[i%COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
        {expenseCategories.length > 0 && (
          <div className="chart-card">
            <h3>Distribución de Gastos</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={expenseCategories} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis type="number" tick={{fill:'rgba(255,255,255,0.35)',fontSize:12}} />
                <YAxis dataKey="category" type="category" tick={{fill:'rgba(255,255,255,0.35)',fontSize:11}} width={80} />
                <Tooltip />
                <Bar dataKey="total" fill="#ff1744" radius={[0,4,4,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {incomeCategories.length > 0 && (
        <div className="chart-card mb-20">
          <h3>Ingresos por Categoría</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={incomeCategories}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="category" tick={{fill:'rgba(255,255,255,0.35)',fontSize:12}} />
              <YAxis tick={{fill:'rgba(255,255,255,0.35)',fontSize:12}} />
              <Tooltip />
              <Bar dataKey="total" fill="#00c853" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {dashboard && (
        <div className="chart-card">
          <h3>Resumen Financiero</h3>
          <div className="metrics-grid" style={{gridTemplateColumns:'repeat(auto-fill, minmax(180px, 1fr))',marginBottom:0}}>
            <div>
              <div className="text-muted" style={{fontSize:12}}>Balance Total</div>
              <div className="text-primary" style={{fontSize:20,fontWeight:700}}>${(dashboard.totalBalance || 0).toLocaleString()}</div>
            </div>
            <div>
              <div className="text-muted" style={{fontSize:12}}>Deuda Total</div>
              <div className="text-red" style={{fontSize:20,fontWeight:700}}>${(dashboard.totalDebt || 0).toLocaleString()}</div>
            </div>
            <div>
              <div className="text-muted" style={{fontSize:12}}>Patrimonio Neto</div>
              <div className="text-green" style={{fontSize:20,fontWeight:700}}>${(dashboard.netWorth || 0).toLocaleString()}</div>
            </div>
            <div>
              <div className="text-muted" style={{fontSize:12}}>Tasa de Ahorro</div>
              <div style={{fontSize:20,fontWeight:700,color: (dashboard.savingsRate || 0) >= 20 ? 'var(--green)' : (dashboard.savingsRate || 0) >= 10 ? 'var(--gold)' : 'var(--red)'}}>
                {(dashboard.savingsRate || 0).toFixed(0)}%
              </div>
            </div>
            <div>
              <div className="text-muted" style={{fontSize:12}}>Ingreso Mensual</div>
              <div className="text-green" style={{fontSize:20,fontWeight:700}}>${(dashboard.monthlyIncome || 0).toLocaleString()}</div>
            </div>
            <div>
              <div className="text-muted" style={{fontSize:12}}>Gasto Mensual</div>
              <div className="text-red" style={{fontSize:20,fontWeight:700}}>${(dashboard.monthlyExpenses || 0).toLocaleString()}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
