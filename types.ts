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
  transactions: Transaction[];
}

export const DAILY_ALLOWANCE = 30;