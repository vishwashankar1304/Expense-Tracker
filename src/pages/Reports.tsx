import { useMemo, useState } from 'react';
import {
  eachDayOfInterval,
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
  subDays,
  subMonths,
} from 'date-fns';
import type { DateRange } from 'react-day-picker';
import {
  ArrowDownRight,
  ArrowUpRight,
  BadgeIndianRupee,
  CalendarDays,
  Download,
  PiggyBank,
  ShieldCheck,
  Target,
  TrendingDown,
  TrendingUp,
  type LucideIcon,
  Briefcase,
  LineChart,
  Laptop,
  ShoppingBag,
  Utensils,
  Phone,
  Plane,
  Receipt,
  ArrowRightLeft,
} from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useTransactions } from '@/hooks/useTransactions';

type TxTypeFilter = 'all' | 'income' | 'expense' | 'transfer';

const BUDGET_STORAGE_KEY = 'savvy-monthly-budget';
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

const inRangeInclusive = (date: Date, start: Date, end: Date) => {
  return (isAfter(date, start) || isEqual(date, start)) && (isBefore(date, end) || isEqual(date, end));
};

const formatCurrency = (value: number) => `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

const Reports = () => {
  const { transactions } = useTransactions();
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState<TxTypeFilter>('all');
  const [budgetInput, setBudgetInput] = useState(() => {
    const savedBudget = localStorage.getItem(BUDGET_STORAGE_KEY);
    return savedBudget || '50000';
  });

  const budgetLimit = Number(budgetInput) || 0;

  const dateRangeLabel = dateRange?.from
    ? `${format(dateRange.from, 'dd MMM yyyy')} - ${format(dateRange.to || dateRange.from, 'dd MMM yyyy')}`
    : 'Pick date range';

  const categoryOptions = useMemo(() => {
    return Array.from(new Set(transactions.map((transaction) => transaction.category))).sort();
  }, [transactions]);

  const resolvedRange = useMemo(() => {
    if (!dateRange?.from) return null;

    return {
      start: startOfDay(dateRange.from),
      end: endOfDay(dateRange.to || dateRange.from),
    };
  }, [dateRange]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((transaction) => {
      const txDate = parseISO(transaction.date);
      const matchesDate = resolvedRange ? inRangeInclusive(txDate, resolvedRange.start, resolvedRange.end) : true;
      const matchesCategory = categoryFilter === 'all' || transaction.category === categoryFilter;
      const matchesType = typeFilter === 'all' || transaction.type === typeFilter;

      return matchesDate && matchesCategory && matchesType;
    });
  }, [categoryFilter, resolvedRange, transactions, typeFilter]);

  const totals = useMemo(() => {
    const income = filteredTransactions
      .filter((transaction) => transaction.type === 'income')
      .reduce((sum, transaction) => sum + Number(transaction.amount), 0);
    const expense = filteredTransactions
      .filter((transaction) => transaction.type === 'expense')
      .reduce((sum, transaction) => sum + Number(transaction.amount), 0);
    const netSavings = income - expense;
    const savingsRate = income > 0 ? (netSavings / income) * 100 : 0;

    return { income, expense, netSavings, savingsRate };
  }, [filteredTransactions]);

  const monthlyComparisons = useMemo(() => {
    const now = new Date();
    const thisMonthStart = startOfMonth(now);
    const thisMonthEnd = endOfDay(now);
    const lastMonthStart = startOfMonth(subMonths(now, 1));
    const lastMonthEnd = endOfMonth(subMonths(now, 1));

    const summarize = (start: Date, end: Date) => {
      const scoped = transactions.filter((transaction) => inRangeInclusive(parseISO(transaction.date), start, end));
      const income = scoped
        .filter((transaction) => transaction.type === 'income')
        .reduce((sum, transaction) => sum + Number(transaction.amount), 0);
      const expense = scoped
        .filter((transaction) => transaction.type === 'expense')
        .reduce((sum, transaction) => sum + Number(transaction.amount), 0);
      const savings = income - expense;
      return { income, expense, savings };
    };

    const thisMonth = summarize(thisMonthStart, thisMonthEnd);
    const lastMonth = summarize(lastMonthStart, lastMonthEnd);

    const percent = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };

    return {
      thisMonth,
      lastMonth,
      incomePct: percent(thisMonth.income, lastMonth.income),
      expensePct: percent(thisMonth.expense, lastMonth.expense),
      savingsPct: percent(thisMonth.savings, lastMonth.savings),
      incomeDiff: thisMonth.income - lastMonth.income,
      expenseDiff: thisMonth.expense - lastMonth.expense,
      savingsDiff: thisMonth.savings - lastMonth.savings,
    };
  }, [transactions]);

  const budgetStats = useMemo(() => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthSpending = transactions
      .filter((transaction) => transaction.type === 'expense' && inRangeInclusive(parseISO(transaction.date), monthStart, endOfDay(now)))
      .reduce((sum, transaction) => sum + Number(transaction.amount), 0);

    const remaining = budgetLimit - monthSpending;
    const usedPercent = budgetLimit > 0 ? Math.min((monthSpending / budgetLimit) * 100, 100) : 0;

    return {
      spending: monthSpending,
      remaining,
      usedPercent,
      overBudget: monthSpending > budgetLimit && budgetLimit > 0,
    };
  }, [budgetLimit, transactions]);

  const categoryDeepAnalysis = useMemo(() => {
    const now = new Date();
    const thisMonthStart = startOfMonth(now);
    const lastMonthStart = startOfMonth(subMonths(now, 1));
    const thisMonthEnd = endOfDay(now);
    const lastMonthEnd = endOfDay(startOfMonth(now));

    const thisMonthMap: Record<string, number> = {};
    const lastMonthMap: Record<string, number> = {};

    transactions
      .filter((transaction) => transaction.type === 'expense')
      .forEach((transaction) => {
        const txDate = parseISO(transaction.date);
        if (inRangeInclusive(txDate, thisMonthStart, thisMonthEnd)) {
          thisMonthMap[transaction.category] = (thisMonthMap[transaction.category] || 0) + Number(transaction.amount);
        }
        if (inRangeInclusive(txDate, lastMonthStart, lastMonthEnd)) {
          lastMonthMap[transaction.category] = (lastMonthMap[transaction.category] || 0) + Number(transaction.amount);
        }
      });

    const totalThisMonth = Object.values(thisMonthMap).reduce((sum, value) => sum + value, 0);

    return Object.entries(thisMonthMap)
      .map(([category, amount]) => {
        const previous = lastMonthMap[category] || 0;
        const trend = previous === 0 ? (amount > 0 ? 100 : 0) : ((amount - previous) / previous) * 100;
        const percent = totalThisMonth > 0 ? (amount / totalThisMonth) * 100 : 0;

        return {
          category,
          amount,
          percent,
          trend,
          isUp: trend >= 0,
        };
      })
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  }, [transactions]);

  const dailyExpenseData = useMemo(() => {
    const now = new Date();
    const days = eachDayOfInterval({ start: startOfDay(subDays(now, 6)), end: endOfDay(now) });

    return days.map((day) => {
      const total = filteredTransactions
        .filter((transaction) => transaction.type === 'expense' && isSameDay(parseISO(transaction.date), day))
        .reduce((sum, transaction) => sum + Number(transaction.amount), 0);
      return {
        label: format(day, 'EEE'),
        value: total,
      };
    });
  }, [filteredTransactions]);

  const weeklySummary = useMemo(() => {
    const now = new Date();
    const start = startOfWeek(now, { weekStartsOn: 1 });
    const end = endOfDay(now);

    const weekTransactions = filteredTransactions.filter((transaction) => inRangeInclusive(parseISO(transaction.date), start, end));
    const income = weekTransactions
      .filter((transaction) => transaction.type === 'income')
      .reduce((sum, transaction) => sum + Number(transaction.amount), 0);
    const expense = weekTransactions
      .filter((transaction) => transaction.type === 'expense')
      .reduce((sum, transaction) => sum + Number(transaction.amount), 0);

    return {
      income,
      expense,
      savings: income - expense,
    };
  }, [filteredTransactions]);

  const smartInsights = useMemo(() => {
    const insights: string[] = [];

    if (categoryDeepAnalysis[0]) {
      insights.push(`You spent most on ${categoryDeepAnalysis[0].category} this month.`);
    }

    if (monthlyComparisons.expensePct > 0) {
      insights.push(`Expenses increased by ${monthlyComparisons.expensePct.toFixed(1)}% compared to last month.`);
    } else if (monthlyComparisons.expensePct < 0) {
      insights.push(`Expenses decreased by ${Math.abs(monthlyComparisons.expensePct).toFixed(1)}% compared to last month.`);
    }

    if (totals.savingsRate >= 30) {
      insights.push('Your savings rate is healthy and above 30%.');
    } else if (totals.savingsRate < 15) {
      insights.push('Savings rate is low. Consider reviewing discretionary spending.');
    }

    return insights;
  }, [categoryDeepAnalysis, monthlyComparisons.expensePct, totals.savingsRate]);

  const financialHealth = useMemo(() => {
    const score =
      (totals.savingsRate >= 30 ? 50 : totals.savingsRate >= 15 ? 30 : 10) +
      (monthlyComparisons.expensePct <= 0 ? 30 : monthlyComparisons.expensePct < 10 ? 20 : 10) +
      (budgetStats.overBudget ? 10 : 20);

    if (score >= 75) return { label: 'Good', score, color: 'text-income' };
    if (score >= 50) return { label: 'Average', score, color: 'text-primary' };
    return { label: 'Poor', score, color: 'text-expense' };
  }, [budgetStats.overBudget, monthlyComparisons.expensePct, totals.savingsRate]);

  const hasData = filteredTransactions.length > 0;

  const summaryCards = [
    {
      title: 'Total Income',
      value: totals.income,
      trend: monthlyComparisons.incomePct,
      icon: TrendingUp,
      valueClass: 'text-income',
    },
    {
      title: 'Total Expense',
      value: totals.expense,
      trend: monthlyComparisons.expensePct,
      icon: TrendingDown,
      valueClass: 'text-expense',
    },
    {
      title: 'Net Savings',
      value: totals.netSavings,
      trend: monthlyComparisons.savingsPct,
      icon: PiggyBank,
      valueClass: 'text-foreground',
    },
    {
      title: 'Savings Rate',
      value: totals.savingsRate,
      trend: monthlyComparisons.savingsPct,
      icon: Target,
      valueClass: 'text-primary',
      suffix: '%',
    },
  ];

  const handleBudgetSave = () => {
    localStorage.setItem(BUDGET_STORAGE_KEY, budgetInput || '0');
  };

  const handleDownloadReport = () => {
    const rows = [
      ['Date', 'Type', 'Category', 'Amount'],
      ...filteredTransactions.map((transaction) => [transaction.date, transaction.type, transaction.category, String(transaction.amount)]),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `expense-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reports</h1>
          <p className="text-sm text-muted-foreground">Professional financial reporting with actionable insights.</p>
        </div>
        <Button className="gap-2" onClick={handleDownloadReport}>
          <Download className="h-4 w-4" /> Download Report
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarDays className="h-4 w-4 text-primary" /> Interactive Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="justify-start">
                <CalendarDays className="mr-2 h-4 w-4" /> {dateRangeLabel}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar mode="range" selected={dateRange} onSelect={setDateRange} numberOfMonths={2} />
            </PopoverContent>
          </Popover>

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

          <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as TxTypeFilter)}>
            <SelectTrigger>
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="income">Income</SelectItem>
              <SelectItem value="expense">Expense</SelectItem>
              <SelectItem value="transfer">Transfer</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="ghost"
            onClick={() => {
              setDateRange(undefined);
              setCategoryFilter('all');
              setTypeFilter('all');
            }}
          >
            Reset Filters
          </Button>
        </CardContent>
      </Card>

      {!hasData ? (
        <Card>
          <CardContent className="py-14 text-center text-muted-foreground">No report data available</CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {summaryCards.map((card) => {
              const TrendIcon = card.trend >= 0 ? ArrowUpRight : ArrowDownRight;
              const trendClass = card.trend >= 0 ? 'text-income' : 'text-expense';
              const CardIcon = card.icon;

              return (
                <Card key={card.title} className="shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
                  <CardContent className="space-y-2 p-5">
                    <div className="flex items-center justify-between">
                      <div className="rounded-lg bg-primary/10 p-2">
                        <CardIcon className="h-4 w-4 text-primary" />
                      </div>
                      <p className={`inline-flex items-center text-xs font-semibold ${trendClass}`}>
                        <TrendIcon className="mr-1 h-3.5 w-3.5" /> {Math.abs(card.trend).toFixed(1)}%
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">{card.title}</p>
                    <p className={`text-lg font-bold ${card.valueClass}`}>
                      {card.suffix ? `${card.value.toFixed(1)}${card.suffix}` : formatCurrency(card.value)}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <Card className="xl:col-span-2">
              <CardHeader>
                <CardTitle>This Month vs Last Month</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { label: 'Income Difference', value: monthlyComparisons.incomeDiff },
                  { label: 'Expense Difference', value: monthlyComparisons.expenseDiff },
                  { label: 'Savings Difference', value: monthlyComparisons.savingsDiff },
                ].map((item) => {
                  const isPositive = item.value >= 0;
                  const Icon = isPositive ? ArrowUpRight : ArrowDownRight;
                  const color = item.label.includes('Expense') ? (isPositive ? 'text-expense' : 'text-income') : isPositive ? 'text-income' : 'text-expense';

                  return (
                    <div key={item.label} className="flex items-center justify-between rounded-xl border bg-secondary/20 p-3">
                      <span className="text-sm text-muted-foreground">{item.label}</span>
                      <span className={`inline-flex items-center font-semibold ${color}`}>
                        <Icon className="mr-1 h-4 w-4" /> {formatCurrency(Math.abs(item.value))}
                      </span>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Financial Health Indicator</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="rounded-xl border bg-secondary/20 p-4">
                  <p className="text-xs text-muted-foreground">Health Score</p>
                  <p className={`text-2xl font-bold ${financialHealth.color}`}>{financialHealth.score}/100</p>
                  <p className={`text-sm font-semibold ${financialHealth.color}`}>{financialHealth.label}</p>
                </div>
                <Progress value={financialHealth.score} className="h-3" />
                <p className="text-xs text-muted-foreground">Based on savings rate, expense trends, and budget discipline.</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <Card className="xl:col-span-2">
              <CardHeader>
                <CardTitle>Budget Tracking</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={budgetInput}
                    onChange={(event) => setBudgetInput(event.target.value)}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="Set monthly budget"
                  />
                  <Button onClick={handleBudgetSave}>Set Monthly Budget</Button>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">Budget Limit</p>
                    <p className="font-semibold">{formatCurrency(budgetLimit)}</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">Current Spending</p>
                    <p className="font-semibold text-expense">{formatCurrency(budgetStats.spending)}</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">Remaining Budget</p>
                    <p className={`font-semibold ${budgetStats.remaining >= 0 ? 'text-income' : 'text-expense'}`}>
                      {formatCurrency(budgetStats.remaining)}
                    </p>
                  </div>
                </div>

                <Progress
                  value={budgetStats.usedPercent}
                  className={`h-3 transition-all duration-500 ${budgetStats.overBudget ? '[&>div]:bg-expense' : '[&>div]:bg-income'}`}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Spending Insights</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {smartInsights.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No insights available yet.</p>
                ) : (
                  smartInsights.map((insight) => (
                    <div key={insight} className="rounded-lg border bg-secondary/20 p-3 text-sm">
                      {insight}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <Card className="xl:col-span-2">
              <CardHeader>
                <CardTitle>Category Deep Analysis</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {categoryDeepAnalysis.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No expense categories available.</p>
                ) : (
                  categoryDeepAnalysis.map((item) => {
                    const CategoryIcon = categoryIcons[item.category] || BadgeIndianRupee;
                    const TrendIcon = item.isUp ? ArrowUpRight : ArrowDownRight;

                    return (
                      <div key={item.category} className="space-y-2 rounded-xl border p-3">
                        <div className="flex items-center justify-between gap-3">
                          <p className="flex items-center gap-2 text-sm font-medium">
                            <CategoryIcon className="h-4 w-4 text-muted-foreground" /> {item.category}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {formatCurrency(item.amount)} ({item.percent.toFixed(1)}%)
                          </p>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Share</span>
                          <span className={item.isUp ? 'text-expense' : 'text-income'}>
                            <TrendIcon className="mr-1 inline h-3.5 w-3.5" />
                            {Math.abs(item.trend).toFixed(1)}%
                          </span>
                        </div>
                        <Progress value={item.percent} className="h-2 transition-all duration-500 [&>div]:bg-primary" />
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Weekly Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Income</p>
                  <p className="font-semibold text-income">{formatCurrency(weeklySummary.income)}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Expense</p>
                  <p className="font-semibold text-expense">{formatCurrency(weeklySummary.expense)}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Savings</p>
                  <p className="font-semibold">{formatCurrency(weeklySummary.savings)}</p>
                </div>
                <div className="rounded-lg border bg-secondary/20 p-3 text-xs text-muted-foreground">
                  Updated in real time based on your current filters and transactions.
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Daily Expense Breakdown (Last 7 Days)</CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyExpenseData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} />
                  <Tooltip
                    formatter={(value: number) => [formatCurrency(value), 'Expense']}
                    contentStyle={{ borderRadius: 12, borderColor: 'hsl(var(--border))' }}
                  />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]} fill="hsl(48 100% 50%)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldCheck className="h-4 w-4 text-primary" /> Smart Notes
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Reports are powered by live transaction data from Supabase and update automatically whenever records are added or removed.
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default Reports;
