import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTransactions } from '@/hooks/useTransactions';
import { useAuth } from '@/contexts/AuthContext';
import AddTransactionDialog from '@/components/AddTransactionDialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ArrowDownRight,
  ArrowRightLeft,
  ArrowUpRight,
  Bell,
  Briefcase,
  CalendarDays,
  CircleDollarSign,
  Filter,
  HandCoins,
  Laptop,
  LineChart,
  Phone,
  Plane,
  Receipt,
  Search,
  ShoppingBag,
  Sparkles,
  User,
  Settings,
  LogOut,
  TrendingDown,
  TrendingUp,
  Trash2,
  Utensils,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  eachDayOfInterval,
  endOfDay,
  format,
  isAfter,
  isBefore,
  isEqual,
  isSameDay,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
} from 'date-fns';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const categoryIcons: Record<string, LucideIcon> = {
  Shopping: ShoppingBag,
  Food: Utensils,
  Phone: Phone,
  Travel: Plane,
  Bills: Receipt,
  Salary: Briefcase,
  Investment: LineChart,
  Freelance: Laptop,
  'Account Transfer': ArrowRightLeft,
};

const typeConfig = {
  income: { label: 'Income', color: 'text-income', bg: 'bg-income/10', icon: TrendingUp, sign: '+' },
  expense: { label: 'Expense', color: 'text-expense', bg: 'bg-expense/10', icon: TrendingDown, sign: '-' },
  transfer: { label: 'Transfer', color: 'text-transfer', bg: 'bg-transfer/10', icon: ArrowRightLeft, sign: '-' },
};

type DatePreset = 'all' | 'today' | 'week' | 'month';
type TypeFilter = 'all' | 'income' | 'expense' | 'transfer';
type TrendPeriod = 'weekly' | 'monthly';

const inRangeInclusive = (date: Date, start: Date, end: Date) => {
  return (isAfter(date, start) || isEqual(date, start)) && (isBefore(date, end) || isEqual(date, end));
};

const toCurrency = (value: number) => `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { transactions, isLoading, totalIncome, totalExpense, balance, removeTransaction } = useTransactions();
  const [search, setSearch] = useState('');
  const [datePreset, setDatePreset] = useState<DatePreset>('month');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [trendPeriod, setTrendPeriod] = useState<TrendPeriod>('monthly');
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(true);

  const notifications = [
    'New transaction added',
    'High expense alert',
    'Monthly summary ready',
  ];

  const userLabel =
    (typeof user?.user_metadata?.username === 'string' && user.user_metadata.username) ||
    user?.email ||
    'User';
  const userInitial = userLabel.slice(0, 1).toUpperCase();

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const filtered = useMemo(() => {
    const now = new Date();
    const normalizedSearch = search.trim().toLowerCase();

    return transactions.filter((transaction) => {
      const transactionDate = parseISO(transaction.date);
      const matchesSearch =
        !normalizedSearch ||
        transaction.category.toLowerCase().includes(normalizedSearch) ||
        transaction.type.toLowerCase().includes(normalizedSearch) ||
        String(transaction.amount).includes(normalizedSearch);
      const matchesType = typeFilter === 'all' || transaction.type === typeFilter;

      let matchesDate = true;
      if (datePreset === 'today') {
        matchesDate = isSameDay(transactionDate, now);
      }
      if (datePreset === 'week') {
        matchesDate = inRangeInclusive(transactionDate, startOfWeek(now, { weekStartsOn: 1 }), endOfDay(now));
      }
      if (datePreset === 'month') {
        matchesDate = inRangeInclusive(transactionDate, startOfMonth(now), endOfDay(now));
      }

      return matchesSearch && matchesType && matchesDate;
    });
  }, [datePreset, search, transactions, typeFilter]);

  const recentTransactions = useMemo(() => transactions.slice(0, 5), [transactions]);
  const mostRecentId = recentTransactions[0]?.id;

  const categorySummary = useMemo(() => {
    const expenseByCategory = filtered
      .filter((transaction) => transaction.type === 'expense')
      .reduce<Record<string, number>>((acc, transaction) => {
        acc[transaction.category] = (acc[transaction.category] || 0) + Number(transaction.amount);
        return acc;
      }, {});

    return Object.entries(expenseByCategory)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  }, [filtered]);

  const highestCategoryAmount = categorySummary[0]?.amount || 1;

  const chartData = useMemo(() => {
    const now = new Date();
    const days = eachDayOfInterval({ start: subDays(now, 6), end: now });

    return days.map((day) => {
      const dayTransactions = transactions.filter((transaction) => isSameDay(parseISO(transaction.date), day));
      return {
        day: format(day, 'EEE'),
        income: dayTransactions
          .filter((transaction) => transaction.type === 'income')
          .reduce((sum, transaction) => sum + Number(transaction.amount), 0),
        expense: dayTransactions
          .filter((transaction) => transaction.type === 'expense')
          .reduce((sum, transaction) => sum + Number(transaction.amount), 0),
      };
    });
  }, [transactions]);

  const trendStats = useMemo(() => {
    const days = trendPeriod === 'weekly' ? 7 : 30;
    const now = new Date();

    const currentStart = startOfDay(subDays(now, days - 1));
    const currentEnd = endOfDay(now);
    const previousStart = startOfDay(subDays(currentStart, days));
    const previousEnd = endOfDay(subDays(currentStart, 1));

    const summarizeRange = (start: Date, end: Date) => {
      const rangeTransactions = transactions.filter((transaction) => inRangeInclusive(parseISO(transaction.date), start, end));
      const income = rangeTransactions
        .filter((transaction) => transaction.type === 'income')
        .reduce((sum, transaction) => sum + Number(transaction.amount), 0);
      const expense = rangeTransactions
        .filter((transaction) => transaction.type === 'expense')
        .reduce((sum, transaction) => sum + Number(transaction.amount), 0);

      return { income, expense, balance: income - expense };
    };

    const current = summarizeRange(currentStart, currentEnd);
    const previous = summarizeRange(previousStart, previousEnd);

    const getPercentChange = (curr: number, prev: number) => {
      if (prev === 0) return curr > 0 ? 100 : 0;
      return ((curr - prev) / prev) * 100;
    };

    return {
      income: getPercentChange(current.income, previous.income),
      expense: getPercentChange(current.expense, previous.expense),
      balance: getPercentChange(current.balance, previous.balance),
    };
  }, [transactions, trendPeriod]);

  const summaryCards = [
    { title: 'Total Income', value: totalIncome, trend: trendStats.income, color: 'text-income', icon: TrendingUp },
    { title: 'Total Expense', value: totalExpense, trend: trendStats.expense, color: 'text-expense', icon: TrendingDown },
    { title: 'Balance', value: balance, trend: trendStats.balance, color: 'text-foreground', icon: Wallet },
  ];

  const datePresets: Array<{ label: string; value: DatePreset }> = [
    { label: 'All', value: 'all' },
    { label: 'Today', value: 'today' },
    { label: 'This Week', value: 'week' },
    { label: 'This Month', value: 'month' },
  ];

  const typeFilters: Array<{ label: string; value: TypeFilter }> = [
    { label: 'All Types', value: 'all' },
    { label: 'Income', value: 'income' },
    { label: 'Expense', value: 'expense' },
    { label: 'Transfer', value: 'transfer' },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="sticky top-0 z-30 -mx-2 rounded-2xl border border-primary/10 bg-background/85 p-2 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_minmax(320px,520px)_1fr] lg:items-center">
          <div className="px-2">
            <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
            <p className="text-sm text-muted-foreground">Track your money flow with smart insights and quick actions.</p>
          </div>

          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search transactions..."
              className="h-11 rounded-full border-primary/20 bg-card pl-9 shadow-sm"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <div className="flex items-center justify-start gap-2 px-2 lg:justify-end">
            <DropdownMenu onOpenChange={(open) => open && setHasUnreadNotifications(false)}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="relative rounded-full border-primary/20 bg-card shadow-sm transition-all duration-200 hover:scale-105 hover:bg-secondary active:scale-95"
                >
                  <Bell className="h-4 w-4" />
                  {hasUnreadNotifications ? <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-expense" /> : null}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72">
                <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {notifications.map((note) => (
                  <DropdownMenuItem key={note} className="py-2 text-sm">
                    {note}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-full border border-primary/20 bg-card px-2 py-1.5 shadow-sm transition-all duration-200 hover:bg-secondary active:scale-95">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary/15 text-xs font-semibold text-foreground">{userInitial}</AvatarFallback>
                  </Avatar>
                  <span className="hidden max-w-[150px] truncate text-sm font-medium text-foreground sm:block">{userLabel}</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel className="truncate">{user?.email || 'Signed in user'}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/profile')}>
                  <User className="mr-2 h-4 w-4" /> Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/profile')}>
                  <Settings className="mr-2 h-4 w-4" /> Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-expense focus:text-expense">
                  <LogOut className="mr-2 h-4 w-4" /> Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 rounded-full border bg-card p-1">
          <Button
            variant={trendPeriod === 'weekly' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setTrendPeriod('weekly')}
            className="rounded-full"
          >
            Weekly
          </Button>
          <Button
            variant={trendPeriod === 'monthly' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setTrendPeriod('monthly')}
            className="rounded-full"
          >
            Monthly
          </Button>
      </div>

      <Card className="border-primary/30 bg-gradient-to-r from-secondary/70 to-background">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-primary" /> Smart Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {summaryCards.map(({ title, value, trend, icon: Icon, color }) => {
              const isPositive = trend >= 0;
              const TrendIcon = isPositive ? ArrowUpRight : ArrowDownRight;

              return (
                <div key={title} className="rounded-xl border bg-card p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="rounded-lg bg-primary/10 p-2">
                      <Icon className={`h-4 w-4 ${color}`} />
                    </div>
                    <Badge variant="secondary" className={isPositive ? 'text-income' : 'text-expense'}>
                      <TrendIcon className="mr-1 h-3 w-3" />
                      {Math.abs(trend).toFixed(1)}%
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{title}</p>
                  <p className={`text-xl font-bold ${color}`}>{toCurrency(value)}</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CircleDollarSign className="h-4 w-4 text-primary" /> Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <AddTransactionDialog
            defaultType="income"
            trigger={
              <Button className="w-full justify-start gap-2" variant="secondary">
                <TrendingUp className="h-4 w-4 text-income" /> Add Income
              </Button>
            }
          />
          <AddTransactionDialog
            defaultType="expense"
            trigger={
              <Button className="w-full justify-start gap-2" variant="secondary">
                <TrendingDown className="h-4 w-4 text-expense" /> Add Expense
              </Button>
            }
          />
          <AddTransactionDialog
            defaultType="transfer"
            trigger={
              <Button className="w-full justify-start gap-2" variant="secondary">
                <ArrowRightLeft className="h-4 w-4 text-transfer" /> Add Transfer
              </Button>
            }
          />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarDays className="h-4 w-4 text-primary" /> Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentTransactions.length === 0 ? (
              <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                Start by adding your first transaction
              </div>
            ) : (
              recentTransactions.map((transaction) => {
                const CategoryIcon = categoryIcons[transaction.category] || Receipt;
                const typeDetails = typeConfig[transaction.type];

                return (
                  <div
                    key={transaction.id}
                    className={`flex items-center gap-3 rounded-xl border p-3 transition-all duration-200 hover:bg-secondary/40 ${
                      transaction.id === mostRecentId ? 'border-primary/60 bg-primary/5 ring-1 ring-primary/20' : ''
                    }`}
                  >
                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${typeDetails.bg}`}>
                      <CategoryIcon className={`h-4 w-4 ${typeDetails.color}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-foreground">{transaction.category}</p>
                      <p className="text-xs text-muted-foreground">{format(parseISO(transaction.date), 'PPP')} · {typeDetails.label}</p>
                    </div>
                    <p className={`font-semibold ${typeDetails.color}`}>
                      {typeDetails.sign}
                      {toCurrency(Number(transaction.amount)).replace('₹', '')}
                    </p>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <HandCoins className="h-4 w-4 text-primary" /> Category Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {categorySummary.length === 0 ? (
              <p className="text-sm text-muted-foreground">No spending data for selected filters.</p>
            ) : (
              categorySummary.map((item) => {
                const CategoryIcon = categoryIcons[item.category] || Receipt;
                const width = `${Math.max((item.amount / highestCategoryAmount) * 100, 8)}%`;

                return (
                  <div key={item.category} className="space-y-2 rounded-xl border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                        <CategoryIcon className="h-4 w-4 text-muted-foreground" />
                        {item.category}
                      </p>
                      <span className="text-sm font-semibold text-expense">{toCurrency(item.amount)}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-secondary">
                      <div className="h-full rounded-full bg-expense transition-all duration-500" style={{ width }} />
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Income vs Expense (Last 7 Days)</CardTitle>
        </CardHeader>
        <CardContent className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="incomeGradient" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="hsl(142 71% 45%)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="hsl(142 71% 45%)" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="expenseGradient" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="hsl(0 84% 60%)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="hsl(0 84% 60%)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="day" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ borderRadius: 12, borderColor: 'hsl(var(--border))' }}
                formatter={(value: number) => toCurrency(value)}
              />
              <Area type="monotone" dataKey="income" stroke="hsl(142 71% 45%)" fill="url(#incomeGradient)" strokeWidth={2} />
              <Area type="monotone" dataKey="expense" stroke="hsl(0 84% 60%)" fill="url(#expenseGradient)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="space-y-4">
          <CardTitle>Transactions</CardTitle>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Filter className="h-4 w-4" />
              Date
            </div>
            {datePresets.map((preset) => (
              <Button
                key={preset.value}
                size="sm"
                variant={datePreset === preset.value ? 'default' : 'outline'}
                onClick={() => setDatePreset(preset.value)}
                className="rounded-full"
              >
                {preset.label}
              </Button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground">Type</span>
            {typeFilters.map((filterOption) => (
              <Button
                key={filterOption.value}
                size="sm"
                variant={typeFilter === filterOption.value ? 'default' : 'outline'}
                onClick={() => setTypeFilter(filterOption.value)}
                className="rounded-full"
              >
                {filterOption.label}
              </Button>
            ))}
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center">
              <p className="font-medium text-foreground">No transactions found</p>
              <p className="mt-1 text-sm text-muted-foreground">Start by adding your first transaction</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map((transaction) => {
                const CategoryIcon = categoryIcons[transaction.category] || Receipt;
                const typeDetails = typeConfig[transaction.type];

                return (
                  <div
                    key={transaction.id}
                    className="animate-in fade-in-50 slide-in-from-bottom-1 flex items-center gap-4 px-5 py-3 transition-all duration-200 hover:bg-muted/40"
                  >
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${typeDetails.bg}`}>
                      <CategoryIcon className={`h-4 w-4 ${typeDetails.color}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-foreground">{transaction.category}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(parseISO(transaction.date), 'PP')} · {typeDetails.label}
                      </p>
                    </div>
                    <span className={`font-semibold ${typeDetails.color}`}>
                      {typeDetails.sign}
                      {toCurrency(Number(transaction.amount)).replace('₹', '')}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0 text-muted-foreground transition-colors hover:text-expense"
                      onClick={() => removeTransaction(transaction.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <AddTransactionDialog floating />
    </div>
  );
};

export default Dashboard;
