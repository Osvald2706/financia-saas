const API_BASE = '/api';

let authToken: string | null = localStorage.getItem('financia_token');

export function setToken(token: string | null) {
  authToken = token;
  if (token) localStorage.setItem('financia_token', token);
  else localStorage.removeItem('financia_token');
}

export function getToken() {
  return authToken;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (res.status === 401) {
    setToken(null);
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }

  if (path.includes('/reports/pdf') || path.includes('/reports/excel')) {
    if (!res.ok) throw new Error('Download failed');
    return res as unknown as T;
  }

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const api = {
  auth: {
    login: (email: string, password: string) =>
      request<{ token: string; user: any }>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
    register: (email: string, password: string, name: string) =>
      request<{ token: string; user: any }>('/auth/register', { method: 'POST', body: JSON.stringify({ email, password, name }) }),
    profile: () => request<any>('/auth/profile'),
    updateProfile: (data: any) => request<any>('/auth/profile', { method: 'PUT', body: JSON.stringify(data) }),
  },
  accounts: {
    list: () => request<any[]>('/accounts'),
    get: (id: string) => request<any>(`/accounts/${id}`),
    create: (data: any) => request<any>('/accounts', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => request<any>(`/accounts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => request<any>(`/accounts/${id}`, { method: 'DELETE' }),
  },
  transactions: {
    list: (params?: Record<string, string>) => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : '';
      return request<{ transactions: any[]; total: number }>(`/transactions${qs}`);
    },
    create: (data: any) => request<any>('/transactions', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => request<any>(`/transactions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => request<any>(`/transactions/${id}`, { method: 'DELETE' }),
  },
  debts: {
    list: () => request<any[]>('/debts'),
    create: (data: any) => request<any>('/debts', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => request<any>(`/debts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => request<any>(`/debts/${id}`, { method: 'DELETE' }),
  },
  goals: {
    list: () => request<any[]>('/goals'),
    create: (data: any) => request<any>('/goals', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => request<any>(`/goals/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => request<any>(`/goals/${id}`, { method: 'DELETE' }),
  },
  analytics: {
    dashboard: () => request<any>('/analytics/dashboard'),
    expensesByCategory: (year?: string, month?: string) =>
      request<any>(`/analytics/expenses-by-category?year=${year || ''}&month=${month || ''}`),
    incomeByCategory: (year?: string, month?: string) =>
      request<any>(`/analytics/income-by-category?year=${year || ''}&month=${month || ''}`),
    monthlyTrends: () => request<any[]>('/analytics/monthly-trends'),
    upcomingPayments: () => request<any>('/analytics/upcoming-payments'),
    healthScore: () => request<any>('/analytics/health-score'),
  },
  ai: {
    analyze: () => request<any>('/ai/analyze', { method: 'POST' }),
    debtPlan: () => request<any>('/ai/debt-plan', { method: 'POST' }),
    predictions: () => request<any[]>('/ai/predictions', { method: 'POST' }),
  },
  reports: {
    pdf: () => {
      if (!authToken) throw new Error('Not authenticated');
      return fetch(`${API_BASE}/reports/pdf`, { headers: { Authorization: `Bearer ${authToken}` } });
    },
    excel: () => {
      if (!authToken) throw new Error('Not authenticated');
      return fetch(`${API_BASE}/reports/excel`, { headers: { Authorization: `Bearer ${authToken}` } });
    },
  },
};
