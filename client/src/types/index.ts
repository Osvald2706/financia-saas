export interface User {
  id: string;
  email: string;
  name: string;
  currency: string;
  createdAt?: string;
}

export interface Account {
  id: string;
  userId: string;
  name: string;
  type: 'checking' | 'savings' | 'credit' | 'cash' | 'investment';
  balance: number;
  color?: string;
  createdAt: string;
}

export interface Transaction {
  id: string;
  userId: string;
  accountId: string;
  accountName?: string;
  account_name?: string;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  date: string;
  note?: string;
  recurringId?: string;
  createdAt: string;
}

export interface Debt {
  id: string;
  userId: string;
  name: string;
  creditor?: string;
  totalAmount: number;
  paidAmount: number;
  interestRate: number;
  dueDate?: string;
  category?: string;
  notes?: string;
  createdAt: string;
}

export interface Goal {
  id: string;
  userId: string;
  name: string;
  targetAmount: number;
  savedAmount: number;
  deadline?: string;
  icon?: string;
  category?: string;
  createdAt: string;
}

export interface DashboardData {
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  cashflow: number;
  savings: number;
  totalDebt: number;
  activeDebts: number;
  netWorth: number;
  savingsRate: number;
  incomeChange: number;
  expenseChange: number;
  goals: { total: number; saved: number; target: number };
}

export interface HealthScore {
  score: number;
  level: string;
  color: string;
}

export interface AIAnalysis {
  summary: string;
  recommendations: string[];
  unnecessaryExpenses: string[];
  debtFreeEstimate: string;
  healthTips: string[];
  riskLevel?: string;
}

export interface PaymentPlan {
  plan: Array<{
    id: string;
    name: string;
    remaining: number;
    interestRate: number;
    suggestedMonthlyPayment: number;
    estimatedMonths: number;
    strategy: string;
  }>;
  summary: {
    totalDebt: number;
    disposableIncome: number;
    estimatedMonths: number;
    estimatedCompletionDate: string;
    strategy: string;
  };
}
