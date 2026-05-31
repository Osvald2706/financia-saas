import { useState } from 'react';
import { api } from '../services/api';

export default function AIPage() {
  const [analysis, setAnalysis] = useState<any>(null);
  const [debtPlan, setDebtPlan] = useState<any>(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [activeTab, setActiveTab] = useState<'analysis' | 'debt-plan'>('analysis');

  async function runAnalysis() {
    setLoadingAnalysis(true);
    try {
      const res = await api.ai.analyze();
      setAnalysis(res);
    } catch (err: any) {
      setAnalysis({ summary: 'Error al analizar', recommendations: [], healthTips: [] });
    } finally {
      setLoadingAnalysis(false);
    }
  }

  async function runDebtPlan() {
    setLoadingPlan(true);
    try {
      const res = await api.ai.debtPlan();
      setDebtPlan(res);
    } catch (err: any) {
      setDebtPlan({ plan: [], summary: { totalDebt: 0, estimatedMonths: 0 } });
    } finally {
      setLoadingPlan(false);
    }
  }

  const riskColors: Record<string, string> = { ALTO: 'var(--red)', MEDIO: 'var(--orange)', BAJO: 'var(--green)' };

  return (
    <div className="fade-in">
      <div className="flex gap-8 mb-20">
        <button
          className={`btn ${activeTab === 'analysis' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
          onClick={() => setActiveTab('analysis')}
        >
          ✦ Análisis Financiero
        </button>
        <button
          className={`btn ${activeTab === 'debt-plan' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
          onClick={() => setActiveTab('debt-plan')}
        >
          ⊘ Plan de Pagos
        </button>
      </div>

      {activeTab === 'analysis' && (
        <>
          <div className="ai-section">
            <h3>✦ Análisis Inteligente de Finanzas</h3>
            <p className="text-secondary" style={{fontSize:13,marginBottom:16}}>
              La IA analizará tus transacciones, deudas, cuentas y metas para darte recomendaciones personalizadas.
            </p>
            <button className="btn btn-primary" onClick={runAnalysis} disabled={loadingAnalysis}>
              {loadingAnalysis ? <><span className="ai-spinner" /> Analizando...</> : '🚀 Analizar mis finanzas'}
            </button>
          </div>

          {analysis && (
            <>
              <div className="ai-section">
                <h3>📋 Resumen Ejecutivo</h3>
                <p className="text-secondary" style={{fontSize:14,lineHeight:1.7}}>{analysis.summary}</p>
              </div>

              {analysis.riskLevel && (
                <div className="ai-section" style={{borderColor: riskColors[analysis.riskLevel] || 'var(--border-color)'}}>
                  <h3>⚠️ Nivel de Riesgo</h3>
                  <span className="credit-badge" style={{
                    background: `${riskColors[analysis.riskLevel]}22`,
                    color: riskColors[analysis.riskLevel],
                    fontSize: 16, padding: '4px 14px',
                  }}>{analysis.riskLevel}</span>
                </div>
              )}

              {analysis.recommendations && analysis.recommendations.length > 0 && (
                <div className="ai-section">
                  <h3>💡 Recomendaciones Personalizadas</h3>
                  {analysis.recommendations.map((r: string, i: number) => (
                    <div key={i} className="prediction-card mb-8" style={{borderLeft: '3px solid var(--gold)'}}>
                      <div className="pred-text">{r}</div>
                    </div>
                  ))}
                </div>
              )}

              {analysis.unnecessaryExpenses && analysis.unnecessaryExpenses.length > 0 && (
                <div className="ai-section">
                  <h3>🔍 Gastos Innecesarios Detectados</h3>
                  {analysis.unnecessaryExpenses.map((e: string, i: number) => (
                    <div key={i} className="prediction-card mb-8" style={{borderLeft: '3px solid var(--red)'}}>
                      <div className="pred-text">{e}</div>
                    </div>
                  ))}
                </div>
              )}

              {analysis.debtFreeEstimate && (
                <div className="ai-section">
                  <h3>⏱️ Proyección Libre de Deudas</h3>
                  <p className="text-secondary" style={{fontSize:15,fontWeight:600,color:'var(--green)'}}>{analysis.debtFreeEstimate}</p>
                </div>
              )}

              {analysis.healthTips && analysis.healthTips.length > 0 && (
                <div className="ai-section">
                  <h3>🌱 Consejos de Salud Financiera</h3>
                  {analysis.healthTips.map((tip: string, i: number) => (
                    <div key={i} className="prediction-card mb-8" style={{borderLeft: '3px solid var(--blue)'}}>
                      <div className="pred-icon" style={{width:24,height:24,fontSize:12}}>{i + 1}</div>
                      <div className="pred-text">{tip}</div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {!analysis && !loadingAnalysis && (
            <div className="empty-state">
              <div className="empty-icon">✦</div>
              <h3>Análisis IA</h3>
              <p>Presiona "Analizar mis finanzas" para obtener un diagnóstico completo</p>
            </div>
          )}
        </>
      )}

      {activeTab === 'debt-plan' && (
        <>
          <div className="ai-section">
            <h3>⊘ Plan Inteligente de Pagos</h3>
            <p className="text-secondary" style={{fontSize:13,marginBottom:16}}>
              La IA calculará la mejor estrategia para pagar tus deudas usando el método avalancha (priorizar intereses más altos).
            </p>
            <button className="btn btn-primary" onClick={runDebtPlan} disabled={loadingPlan}>
              {loadingPlan ? <><span className="ai-spinner" /> Calculando...</> : '📊 Generar plan de pagos'}
            </button>
          </div>

          {debtPlan && (
            <>
              {debtPlan.summary && (
                <div className="ai-section">
                  <h3>📊 Resumen del Plan</h3>
                  <div className="metrics-grid" style={{gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))'}}>
                    <div>
                      <div className="text-muted" style={{fontSize:12}}>Deuda Total</div>
                      <div className="text-red" style={{fontSize:22,fontWeight:700}}>${(debtPlan.summary.totalDebt || 0).toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-muted" style={{fontSize:12}}>Ingreso Disponible</div>
                      <div className="text-green" style={{fontSize:22,fontWeight:700}}>${(debtPlan.summary.disposableIncome || 0).toLocaleString()}/mes</div>
                    </div>
                    <div>
                      <div className="text-muted" style={{fontSize:12}}>Tiempo Estimado</div>
                      <div style={{fontSize:22,fontWeight:700,color:'var(--gold)'}}>{debtPlan.summary.estimatedMonths} meses</div>
                    </div>
                    <div>
                      <div className="text-muted" style={{fontSize:12}}>Fecha Estimada</div>
                      <div style={{fontSize:16,fontWeight:600,color:'var(--green)'}}>{debtPlan.summary.estimatedCompletionDate || '—'}</div>
                    </div>
                  </div>
                </div>
              )}

              {debtPlan.plan && debtPlan.plan.length > 0 && (
                <div className="ai-section">
                  <h3>📋 Orden de Pagos Recomendado</h3>
                  {debtPlan.plan.map((d: any, i: number) => (
                    <div key={d.id} className="debt-card mb-8">
                      <div className="debt-header">
                        <div>
                          <div className="debt-name">{d.name}</div>
                          <div className="debt-creditor">Estrategia: {d.strategy === 'pay_first' ? 'Pagar primero' : d.strategy === 'pay_fast' ? 'Pago rápido' : 'Avalancha'}</div>
                        </div>
                        <span className="credit-badge high">#{i + 1}</span>
                      </div>
                      <div className="debt-amounts">
                        <div className="debt-total">${(d.remaining || 0).toLocaleString()}</div>
                        <div className="debt-paid">Interés: <span>{d.interestRate}%</span></div>
                      </div>
                      <div className="debt-info">
                        <span>Pago sugerido: ${(d.suggestedMonthlyPayment || 0).toLocaleString()}/mes</span>
                        <span>~{d.estimatedMonths} meses</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {!debtPlan && !loadingPlan && (
            <div className="empty-state">
              <div className="empty-icon">⊘</div>
              <h3>Plan de Pagos</h3>
              <p>Genera un plan personalizado para salir de deudas más rápido</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
