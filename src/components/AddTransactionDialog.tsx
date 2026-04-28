import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { Plus, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { useTransactions } from '@/hooks/useTransactions';
import { TransactionType, CATEGORIES } from '@/types/transaction';

type AddTransactionDialogProps = {
  defaultType?: TransactionType;
  trigger?: React.ReactNode;
  floating?: boolean;
};

const AddTransactionDialog = ({ defaultType = 'expense', trigger, floating = false }: AddTransactionDialogProps) => {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<TransactionType>(defaultType);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState<Date>(new Date());
  const { user } = useAuth();
  const { addTransaction, isAdding } = useTransactions();

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) {
      setType(defaultType);
      setCategory('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !amount || !category) return;
    await addTransaction({
      user_id: user.id,
      type,
      amount: parseFloat(amount),
      category,
      date: format(date, 'yyyy-MM-dd'),
    });
    setOpen(false);
    setAmount('');
    setCategory('');
    setType(defaultType);
    setDate(new Date());
  };

  const defaultTrigger = (
    <Button
      size="icon"
      className={cn(
        'fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg transition-all duration-200 hover:-translate-y-1 hover:scale-105 hover:shadow-xl',
        'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
      )}
    >
      <Plus className="h-6 w-6 transition-transform duration-200 group-hover:rotate-90" />
    </Button>
  );

  const triggerNode = trigger || defaultTrigger;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {floating ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <DialogTrigger asChild>
              <span className="group">{triggerNode}</span>
            </DialogTrigger>
          </TooltipTrigger>
          <TooltipContent side="left">Add Transaction</TooltipContent>
        </Tooltip>
      ) : (
        <DialogTrigger asChild>{triggerNode}</DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Transaction</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input type="number" placeholder="Amount" value={amount} onChange={e => setAmount(e.target.value)} required min="0.01" step="0.01" />
          <Select value={type} onValueChange={(v: TransactionType) => { setType(v); setCategory(''); }}>
            <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="income">Income</SelectItem>
              <SelectItem value="expense">Expense</SelectItem>
              <SelectItem value="transfer">Transfer</SelectItem>
            </SelectContent>
          </Select>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              {CATEGORIES[type].map(c => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(date, 'PPP')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={date} onSelect={d => d && setDate(d)} /></PopoverContent>
          </Popover>
          <Button type="submit" className="w-full" disabled={isAdding}>
            {isAdding ? 'Adding...' : 'Add Transaction'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddTransactionDialog;
