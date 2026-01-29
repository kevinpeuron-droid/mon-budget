export interface Transaction {
  id: string;
  amount: number;
  description: string;
  date: string; // ISO string
  type: 'expense' | 'income' | 'adjustment';
}

export interface BudgetState {
  balance: number;
  lastLoginDate: string; // YYYY-MM-DD
  billingStartDay: number; // 1-31
  transactions: Transaction[];
}

export const DAILY_ALLOWANCE = 30;