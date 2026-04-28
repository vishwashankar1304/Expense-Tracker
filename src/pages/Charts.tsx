import { useMemo, useState } from 'react';
import {
  addDays,
  eachDayOfInterval,
  eachMonthOfInterval,
  endOfDay,
  endOfMonth,
  format,
  isAfter,
  isBefore,
  isEqual,
  isSameDay,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
  subDays,
  subMonths,
} from 'date-fns';
import type { DateRange } from 'react-day-picker';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  ChartNoAxesCombined,
  CircleDollarSign,
  Filter,
  PieChart as PieChartIcon,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { useTransactions } from '@/hooks/useTransactions';

const COLORS = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#6C5CE7'];

type Period = 'weekly' | 'monthly' | 'yearly';
type TrendWindow = '7d' | '30d' | '12m';
type TypeFilter = 'all' | 'income' | 'expense' | 'transfer';

const inRangeInclusive = (date: Date, start: Date, end: Date) => {
  return (isAfter(date, start) || isEqual(date, start)) && (isBefore(date, end) || isEqual(date, end));
};

const formatCurrency = (value: number) => `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

const Charts = () => {
  const { transactions } = useTransactions();
  const [period, setPeriod] = useState<Period>('monthly');
  const [trendWindow, setTrendWindow] = useState<TrendWindow>('30d');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [customRange, setCustomRange] = useState<DateRange | undefined>();

  const categoryOptions = useMemo(() => {
    return Array.from(new Set(transactions.map((transaction) => transaction.category))).sort();
  }, [transactions]);

  const periodRange = useMemo(() => {
    const now = new Date();
    const start =
      period === 'weekly'
        ? startOfWeek(now, { weekStartsOn: 1 })
        : period === 'monthly'
          ? startOfMonth(now)
          : startOfYear(now);

    return {
      start,
      end: endOfDay(now),
    };
  }, [period]);

  const activeDateRange = useMemo(() => {
    if (customRange?.from) {
      return {
        start: startOfDay(customRange.from),
        end: customRange.to ? endOfDay(customRange.to) : endOfDay(customRange.from),
      };
    }

    return periodRange;
  }, [customRange, periodRange]);

  const filtered = useMemo(() => {
    return transactions.filter((transaction) => {
      const transactionDate = parseISO(transaction.date);
      const matchesType = typeFilter === 'all' || transaction.type === typeFilter;
      const matchesCategory = categoryFilter === 'all' || transaction.category === categoryFilter;
      const matchesDate = inRangeInclusive(transactionDate, activeDateRange.start, activeDateRange.end);

      return matchesType && matchesCategory && matchesDate;
    });
  }, [activeDateRange.end, activeDateRange.start, categoryFilter, transactions, typeFilter]);

  const totals = useMemo(() => {
    const income = filtered.filter((transaction) => transaction.type === 'income').reduce((sum, transaction) => sum + Number(transaction.amount), 0);
    const expense = filtered.filter((transaction) => transaction.type === 'expense').reduce((sum, transaction) => sum + Number(transaction.amount), 0);

    return { income, expense };
  }, [filtered]);

  const trendData = useMemo(() => {
    const now = new Date();

    const base = transactions.filter((transaction) => {
      const matchesType = typeFilter === 'all' || transaction.type === typeFilter;
      const matchesCategory = categoryFilter === 'all' || transaction.category === categoryFilter;
      return matchesType && matchesCategory;
    });

    if (trendWindow === '12m') {
      const months = eachMonthOfInterval({ start: startOfMonth(subMonths(now, 11)), end: endOfMonth(now) });
      return months.map((monthDate) => {
        const income = base
          .filter((transaction) => transaction.type === 'income' && inRangeInclusive(parseISO(transaction.date), startOfMonth(monthDate), endOfMonth(monthDate)))
          .reduce((sum, transaction) => sum + Number(transaction.amount), 0);

        const expense = base
          .filter((transaction) => transaction.type === 'expense' && inRangeInclusive(parseISO(transaction.date), startOfMonth(monthDate), endOfMonth(monthDate)))
          .reduce((sum, transaction) => sum + Number(transaction.amount), 0);

        return {
          label: format(monthDate, 'MMM'),
          income,
          expense,
        };
      });
    }

    const dayCount = trendWindow === '7d' ? 7 : 30;
    const days = eachDayOfInterval({ start: subDays(now, dayCount - 1), end: now });

    return days.map((dayDate) => {
      const dayItems = base.filter((transaction) => isSameDay(parseISO(transaction.date), dayDate));
      return {
        label: format(dayDate, trendWindow === '7d' ? 'EEE' : 'dd MMM'),
        income: dayItems
          .filter((transaction) => transaction.type === 'income')
          .reduce((sum, transaction) => sum + Number(transaction.amount), 0),
        expense: dayItems
          .filter((transaction) => transaction.type === 'expense')
          .reduce((sum, transaction) => sum + Number(transaction.amount), 0),
      };
    });
  }, [categoryFilter, transactions, trendWindow, typeFilter]);

  const expenseByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    filtered
      .filter((transaction) => transaction.type === 'expense')
      .forEach((transaction) => {
        map[transaction.category] = (map[transaction.category] || 0) + Number(transaction.amount);
      });

    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filtered]);

  const totalExpense = expenseByCategory.reduce((sum, category) => sum + category.value, 0);

  const topSpending = expenseByCategory[0];
  const lowestSpending = expenseByCategory[expenseByCategory.length - 1];

  const dailyExpense = useMemo(() => {
    const now = new Date();
    const days = eachDayOfInterval({ start: subDays(now, 6), end: now });

    return days.map((dayDate) => {
      const value = filtered
        .filter((transaction) => transaction.type === 'expense' && isSameDay(parseISO(transaction.date), dayDate))
        .reduce((sum, transaction) => sum + Number(transaction.amount), 0);

      return {
        day: format(dayDate, 'EEE'),
        value,
      };
    });
  }, [filtered]);

  const monthlyComparison = useMemo(() => {
    const now = new Date();
    const thisMonthStart = startOfMonth(now);
    const thisMonthEnd = endOfMonth(now);
    const lastMonthStart = startOfMonth(subMonths(now, 1));
    const lastMonthEnd = endOfMonth(subMonths(now, 1));

    const thisMonthTotal = transactions
      .filter((transaction) => transaction.type === 'expense' && inRangeInclusive(parseISO(transaction.date), thisMonthStart, thisMonthEnd))
      .reduce((sum, transaction) => sum + Number(transaction.amount), 0);

    const lastMonthTotal = transactions
      .filter((transaction) => transaction.type === 'expense' && inRangeInclusive(parseISO(transaction.date), lastMonthStart, lastMonthEnd))
      .reduce((sum, transaction) => sum + Number(transaction.amount), 0);

    const change = lastMonthTotal === 0 ? (thisMonthTotal > 0 ? 100 : 0) : ((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100;

    return {
      thisMonthTotal,
      lastMonthTotal,
      change,
      isUp: change >= 0,
    };
  }, [transactions]);

  const incomeExpenseRatio = useMemo(() => {
    const income = totals.income;
    const expense = totals.expense;
    const total = income + expense;

    if (total === 0) {
      return {
        incomePercent: 0,
        expensePercent: 0,
      };
    }

    return {
      incomePercent: (income / total) * 100,
      expensePercent: (expense / total) * 100,
    };
  }, [totals.expense, totals.income]);

  const hasData = filtered.length > 0;
  const customRangeLabel = customRange?.from
    ? `${format(customRange.from, 'dd MMM yyyy')} - ${format(customRange.to || customRange.from, 'dd MMM yyyy')}`
    : 'Custom Date Range';

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Charts & Insights</h1>
          <p className="text-sm text-muted-foreground">Explore trends, category behavior, and actionable spending insights.</p>
        </div>

        <Tabs value={period} onValueChange={(value) => setPeriod(value as Period)}>
          <TabsList>
            <TabsTrigger value="weekly">Weekly</TabsTrigger>
            <TabsTrigger value="monthly">Monthly</TabsTrigger>
            <TabsTrigger value="yearly">Yearly</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Filter className="h-4 w-4 text-primary" /> Advanced Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start">
                <CalendarDays className="mr-2 h-4 w-4" />
                {customRangeLabel}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar mode="range" selected={customRange} onSelect={setCustomRange} numberOfMonths={2} />
            </PopoverContent>
          </Popover>

          <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as TypeFilter)}>
            <SelectTrigger>
              <SelectValue placeholder="Transaction Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="income">Income</SelectItem>
              <SelectItem value="expense">Expense</SelectItem>
              <SelectItem value="transfer">Transfer</SelectItem>
            </SelectContent>
          </Select>

          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categoryOptions.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="ghost"
            onClick={() => {
              setCustomRange(undefined);
              setTypeFilter('all');
              setCategoryFilter('all');
            }}
          >
            Reset Filters
          </Button>
        </CardContent>
      </Card>

      {!hasData ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">No data available for selected period</CardContent>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <ChartNoAxesCombined className="h-4 w-4 text-primary" /> Trend Analysis
            </CardTitle>
            <div className="flex items-center gap-2 rounded-full border p-1">
              <Button size="sm" variant={trendWindow === '7d' ? 'default' : 'ghost'} className="rounded-full" onClick={() => setTrendWindow('7d')}>
                7 Days
              </Button>
              <Button size="sm" variant={trendWindow === '30d' ? 'default' : 'ghost'} className="rounded-full" onClick={() => setTrendWindow('30d')}>
                30 Days
              </Button>
              <Button size="sm" variant={trendWindow === '12m' ? 'default' : 'ghost'} className="rounded-full" onClick={() => setTrendWindow('12m')}>
                12 Months
              </Button>
            </div>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="incomeTrend" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="hsl(142 71% 45%)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="hsl(142 71% 45%)" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="expenseTrend" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="hsl(0 84% 60%)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="hsl(0 84% 60%)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={18} />
                <YAxis tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, borderColor: 'hsl(var(--border))' }}
                  formatter={(value: number, name: string) => [formatCurrency(value), name === 'income' ? 'Income' : 'Expense']}
                />
                <Legend />
                <Area type="monotone" dataKey="income" stroke="hsl(142 71% 45%)" fill="url(#incomeTrend)" strokeWidth={2.5} />
                <Area type="monotone" dataKey="expense" stroke="hsl(0 84% 60%)" fill="url(#expenseTrend)" strokeWidth={2.5} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CircleDollarSign className="h-4 w-4 text-primary" /> Income vs Expense Ratio
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Income</span>
                <span className="font-semibold text-income">{incomeExpenseRatio.incomePercent.toFixed(1)}%</span>
              </div>
              <Progress value={incomeExpenseRatio.incomePercent} className="h-3" />
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Expense</span>
                <span className="font-semibold text-expense">{incomeExpenseRatio.expensePercent.toFixed(1)}%</span>
              </div>
              <Progress value={incomeExpenseRatio.expensePercent} className="h-3 [&>div]:bg-expense" />
            </div>
            <div className="rounded-lg border bg-secondary/40 p-3 text-sm text-muted-foreground">
              Income: {formatCurrency(totals.income)}
              <br />
              Expense: {formatCurrency(totals.expense)}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <PieChartIcon className="h-4 w-4 text-primary" /> Detailed Category Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            {expenseByCategory.length === 0 ? (
              <div className="flex h-full items-center justify-center text-muted-foreground">No data available for selected period</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={expenseByCategory}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={68}
                    outerRadius={110}
                    paddingAngle={2}
                  >
                    {expenseByCategory.map((item, index) => (
                      <Cell key={item.name} fill={COLORS[index % COLORS.length]} className="transition-opacity hover:opacity-80" />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number, _name, context: { payload?: { name?: string } }) => {
                      const percent = totalExpense === 0 ? 0 : (value / totalExpense) * 100;
                      return [`${formatCurrency(value)} (${percent.toFixed(1)}%)`, context?.payload?.name || 'Category'];
                    }}
                    contentStyle={{ borderRadius: 12, borderColor: 'hsl(var(--border))' }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">This Month vs Last Month</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Expense comparison</p>
              <p className="mt-1 text-lg font-semibold text-foreground">
                {formatCurrency(monthlyComparison.thisMonthTotal)} vs {formatCurrency(monthlyComparison.lastMonthTotal)}
              </p>
              <div className={`mt-3 inline-flex items-center rounded-full px-2.5 py-1 text-sm font-medium ${monthlyComparison.isUp ? 'bg-expense/10 text-expense' : 'bg-income/10 text-income'}`}>
                {monthlyComparison.isUp ? <ArrowUpRight className="mr-1 h-4 w-4" /> : <ArrowDownRight className="mr-1 h-4 w-4" />}
                {Math.abs(monthlyComparison.change).toFixed(1)}%
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Top Spending Insights</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-xl border bg-secondary/30 p-3">
                <p className="text-xs text-muted-foreground">Highest Expense Category</p>
                <p className="font-semibold text-expense">{topSpending?.name || 'N/A'}</p>
                <p className="text-sm text-muted-foreground">{topSpending ? formatCurrency(topSpending.value) : '-'}</p>
              </div>
              <div className="rounded-xl border bg-secondary/30 p-3">
                <p className="text-xs text-muted-foreground">Lowest Expense Category</p>
                <p className="font-semibold text-income">{lowestSpending?.name || 'N/A'}</p>
                <p className="text-sm text-muted-foreground">{lowestSpending ? formatCurrency(lowestSpending.value) : '-'}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Daily Spending (Last 7 Days)</CardTitle>
        </CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dailyExpense} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="day" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} />
              <Tooltip
                formatter={(value: number) => [formatCurrency(value), 'Expense']}
                contentStyle={{ borderRadius: 12, borderColor: 'hsl(var(--border))' }}
              />
              <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                {dailyExpense.map((item) => (
                  <Cell key={item.day} fill={item.value > 0 ? 'hsl(0 84% 60%)' : 'hsl(48 100% 75%)'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default Charts;
