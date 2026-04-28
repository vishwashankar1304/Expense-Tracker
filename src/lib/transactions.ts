import { supabase } from '@/lib/supabase';
import { Transaction } from '@/types/transaction';

export const fetchTransactions = async (userId: string): Promise<Transaction[]> => {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false });
  if (error) throw error;
  return data || [];
};

export const insertTransaction = async (tx: Omit<Transaction, 'id' | 'created_at'>) => {
  const { error } = await supabase.from('transactions').insert(tx);
  if (error) throw error;
};

export const deleteTransaction = async (id: string) => {
  const { error } = await supabase.from('transactions').delete().eq('id', id);
  if (error) throw error;
};
