export type TransactionType = 'income' | 'expense' | 'transfer';

export interface Transaction {
  id: string;
  user_id: string;
  type: TransactionType;
  amount: number;
  category: string;
  date: string;
  created_at: string;
}

export const CATEGORIES: Record<TransactionType, string[]> = {
  expense: ['Shopping', 'Food', 'Phone', 'Travel', 'Bills'],
  income: ['Salary', 'Investment', 'Freelance'],
  transfer: ['Account Transfer'],
};
