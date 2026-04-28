import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { fetchTransactions, insertTransaction, deleteTransaction } from '@/lib/transactions';
import { Transaction } from '@/types/transaction';
import { useToast } from '@/hooks/use-toast';

export const useTransactions = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const userId = user?.id || '';
  const queryKey = ['transactions', userId] as const;

  const query = useQuery({
    queryKey,
    queryFn: () => fetchTransactions(userId),
    enabled: !!userId,
    staleTime: 30_000,
  });

  const addMutation = useMutation({
    mutationFn: (tx: Omit<Transaction, 'id' | 'created_at'>) => insertTransaction(tx),
    onMutate: async (newTx) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<Transaction[]>(queryKey) || [];

      const optimisticTx: Transaction = {
        ...newTx,
        id: `optimistic-${Date.now()}`,
        created_at: new Date().toISOString(),
      };

      queryClient.setQueryData<Transaction[]>(queryKey, [optimisticTx, ...previous]);
      return { previous };
    },
    onError: (e: any, _newTx, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    },
    onSuccess: () => {
      toast({ title: 'Transaction added' });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => deleteTransaction(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<Transaction[]>(queryKey) || [];

      queryClient.setQueryData<Transaction[]>(
        queryKey,
        previous.filter((tx) => tx.id !== id),
      );

      return { previous };
    },
    onError: (e: any, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    },
    onSuccess: () => {
      toast({ title: 'Transaction deleted' });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const transactions = query.data || [];
  const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
  const balance = totalIncome - totalExpense;

  return {
    transactions,
    isLoading: query.isLoading,
    totalIncome,
    totalExpense,
    balance,
    addTransaction: addMutation.mutateAsync,
    removeTransaction: removeMutation.mutateAsync,
    isAdding: addMutation.isPending,
  };
};
