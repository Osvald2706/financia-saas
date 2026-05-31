import { config } from '../config';

interface FinancialData {
  transactions: any[];
  debts: any[];
  accounts: any[];
  goals: any[];
}

export async function generateFinancialAnalysis(data: FinancialData): Promise<any> {
  if (!config.openAiKey || config.openAiKey === 'sk-your-openai-api-key-here') {
    return generateLocalAnalysis(data);
  }

  try {
    const { default: OpenAI } = await import('openai');
    const openai = new OpenAI({ apiKey: config.openAiKey });

    const prompt = buildAnalysisPrompt(data);

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Eres un experto asesor financiero personal. Analiza los datos financieros del usuario y proporciona:
1. Un resumen ejecutivo de su situación financiera
2. Detección de gastos innecesarios o suscripciones que puede cancelar
3. Recomendaciones personalizadas para mejorar sus finanzas
4. Estrategia de pago de deudas priorizada
5. Estimación de cuándo estará libre de deudas
6. Consejos de salud financiera
Responde SIEMPRE en español, con un tono profesional pero amigable. Usa formato JSON.`
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 2000,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content || '{}';
    return JSON.parse(content);
  } catch (err) {
    console.error('OpenAI API error:', err);
    return generateLocalAnalysis(data);
  }
}

function buildAnalysisPrompt(data: FinancialData): string {
  const { transactions, debts, accounts, goals } = data;

  const totalIncome = transactions.filter((t: any) => t.type === 'income').reduce((s: number, t: any) => s + t.amount, 0);
  const totalExpenses = transactions.filter((t: any) => t.type === 'expense').reduce((s: number, t: any) => s + t.amount, 0);
  const totalDebt = debts.reduce((s: number, d: any) => s + (d.total_amount - d.paid_amount), 0);
  const totalBalance = accounts.reduce((s: number, a: any) => s + a.balance, 0);

  const expenseCategories = transactions
    .filter((t: any) => t.type === 'expense')
    .reduce((acc: any, t: any) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {});

  return JSON.stringify({
    summary: { totalIncome, totalExpenses, totalDebt, totalBalance, netWorth: totalBalance - totalDebt },
    transactions: transactions.slice(0, 50),
    debts,
    accounts,
    goals,
    expenseCategories,
  });
}

function generateLocalAnalysis(data: FinancialData) {
  const { transactions, debts, accounts, goals } = data;

  const totalIncome = transactions.filter((t: any) => t.type === 'income').reduce((s: number, t: any) => s + t.amount, 0);
  const totalExpenses = transactions.filter((t: any) => t.type === 'expense').reduce((s: number, t: any) => s + t.amount, 0);
  const totalDebt = debts.reduce((s: number, d: any) => s + (d.total_amount - d.paid_amount), 0);
  const totalBalance = accounts.reduce((s: number, a: any) => s + a.balance, 0);

  const expenseCategories = transactions
    .filter((t: any) => t.type === 'expense')
    .reduce((acc: any, t: any) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {});

  const topCategories = Object.entries(expenseCategories)
    .sort((a: any, b: any) => b[1] - a[1])
    .slice(0, 3)
    .map(([cat, amt]: [string, any]) => `${cat}: $${amt.toLocaleString()}`);

  const recommendations: string[] = [];
  if (totalExpenses > totalIncome * 0.7) {
    recommendations.push('Tus gastos representan más del 70% de tus ingresos. Considera reducir gastos en entretenimiento y suscripciones.');
  }
  if (totalDebt > totalIncome * 0.5) {
    recommendations.push('Tu deuda es significativa. Prioriza pagar las deudas con mayor tasa de interés primero (método avalancha).');
  }
  if (totalIncome - totalExpenses > 0) {
    recommendations.push(`Tienes un flujo positivo de $${(totalIncome - totalExpenses).toLocaleString()}. Destina al menos el 30% a tus metas de ahorro.`);
  } else {
    recommendations.push('Tu flujo de efectivo es negativo. Es urgente reducir gastos o aumentar ingresos.');
  }
  if (goals.length === 0) {
    recommendations.push('No tienes metas financieras registradas. Establecer metas específicas te ayudará a mantener el enfoque.');
  }

  const unnecessaryExpenses: string[] = [];
  const subscriptionCats = ['Suscripciones', 'Entretenimiento'];
  transactions.filter((t: any) => t.type === 'expense' && subscriptionCats.includes(t.category)).forEach((t: any) => {
    unnecessaryExpenses.push(`${t.category}: $${t.amount.toLocaleString()} (${new Date(t.date).toLocaleDateString()})`);
  });

  const disposable = Math.max(0, totalIncome - totalExpenses);
  const debtFreeMonths = disposable > 0 && totalDebt > 0 ? Math.ceil(totalDebt / disposable) : null;

  return {
    summary: `Tus ingresos totales son $${totalIncome.toLocaleString()} y tus gastos $${totalExpenses.toLocaleString()}. Tu balance total es $${totalBalance.toLocaleString()} y tu deuda es $${totalDebt.toLocaleString()}. Tus categorías de gasto principales son: ${topCategories.join(', ') || 'ninguna aún registrada'}.`,
    recommendations,
    unnecessaryExpenses: unnecessaryExpenses.length > 0 ? unnecessaryExpenses : ['No se detectaron gastos innecesarios evidentes.'],
    debtFreeEstimate: debtFreeMonths ? `A tu ritmo actual, podrías estar libre de deudas en aproximadamente ${debtFreeMonths} meses (${new Date(Date.now() + debtFreeMonths * 30 * 86400000).toLocaleDateString()}).` : 'No es posible estimar con los datos actuales.',
    healthTips: [
      'Registra todos tus gastos diarios para tener visibilidad completa',
      'Intenta seguir la regla 50/30/20: 50% necesidades, 30% deseos, 20% ahorro',
      'Revisa tus suscripciones mensuales y cancela las que no uses',
      'Construye un fondo de emergencia de 3-6 meses de gastos',
    ],
    riskLevel: totalExpenses > totalIncome ? 'ALTO' : totalExpenses > totalIncome * 0.8 ? 'MEDIO' : 'BAJO',
  };
}
