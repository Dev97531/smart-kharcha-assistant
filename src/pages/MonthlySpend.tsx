import { useState, useMemo } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { format, parseISO, startOfMonth, endOfMonth, startOfYear, endOfYear, isWithinInterval, eachDayOfInterval, isSameDay } from 'date-fns';
import { ChevronDown, ChevronUp, CalendarDays } from 'lucide-react';
import { CATEGORY_ICONS, type Category } from '@/types/finance';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

type FilterMode = 'this_month' | 'select_month' | 'full_year';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function MonthlySpend() {
  const { expenses } = useFinance();
  const { t } = useLanguage();
  const now = new Date();

  const [filterMode, setFilterMode] = useState<FilterMode>('this_month');
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [expandedDay, setExpandedDay] = useState<string | null>(null);

  // Generate available years from expenses
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    years.add(now.getFullYear());
    expenses.forEach(e => years.add(parseISO(e.date).getFullYear()));
    return Array.from(years).sort((a, b) => b - a);
  }, [expenses]);

  // Compute date range based on filter
  const { rangeStart, rangeEnd, rangeLabel } = useMemo(() => {
    if (filterMode === 'full_year') {
      const d = new Date(selectedYear, 0, 1);
      return {
        rangeStart: startOfYear(d),
        rangeEnd: endOfYear(d),
        rangeLabel: `${selectedYear}`,
      };
    }
    // this_month or select_month
    const m = filterMode === 'this_month' ? now.getMonth() : selectedMonth;
    const y = filterMode === 'this_month' ? now.getFullYear() : selectedYear;
    const d = new Date(y, m, 1);
    return {
      rangeStart: startOfMonth(d),
      rangeEnd: endOfMonth(d),
      rangeLabel: format(d, 'MMMM yyyy'),
    };
  }, [filterMode, selectedMonth, selectedYear]);

  const filteredExpenses = useMemo(
    () => expenses.filter(e => isWithinInterval(parseISO(e.date), { start: rangeStart, end: rangeEnd })),
    [expenses, rangeStart.toISOString(), rangeEnd.toISOString()]
  );

  const total = filteredExpenses.reduce((s, e) => s + e.amount, 0);

  const byCategory = useMemo(() => {
    const map: Record<string, number> = {};
    filteredExpenses.forEach(e => { map[e.category] = (map[e.category] || 0) + e.amount; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [filteredExpenses]);

  const days = useMemo(() => {
    const end = rangeEnd > now ? now : rangeEnd;
    if (rangeStart > end) return [];
    const allDays = eachDayOfInterval({ start: rangeStart, end });
    return allDays.map(day => {
      const dayExpenses = filteredExpenses.filter(e => isSameDay(parseISO(e.date), day));
      return { day, total: dayExpenses.reduce((s, e) => s + e.amount, 0), expenses: dayExpenses };
    }).filter(d => d.total > 0).reverse();
  }, [filteredExpenses, rangeStart.toISOString(), rangeEnd.toISOString()]);

  const fmt = (n: number) => '₹' + n.toLocaleString('en-IN');

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <CalendarDays size={18} className="text-primary" />
        <h1 className="text-lg font-bold text-foreground">{rangeLabel}</h1>
      </div>
      <p className="text-2xl font-bold text-primary mb-4">{fmt(total)}</p>

      {/* Filter mode tabs */}
      <div className="flex gap-2 mb-3 overflow-x-auto">
        {(['this_month', 'select_month', 'full_year'] as FilterMode[]).map(mode => (
          <button
            key={mode}
            onClick={() => setFilterMode(mode)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              filterMode === mode
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted/50 text-muted-foreground hover:text-foreground'
            }`}
          >
            {mode === 'this_month' ? t('this_month_filter') : mode === 'select_month' ? t('select_month') : t('full_year')}
          </button>
        ))}
      </div>

      {/* Month/Year selectors */}
      {(filterMode === 'select_month' || filterMode === 'full_year') && (
        <div className="flex gap-2 mb-4">
          {filterMode === 'select_month' && (
            <Select value={String(selectedMonth)} onValueChange={v => setSelectedMonth(Number(v))}>
              <SelectTrigger className="flex-1 h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((m, i) => (
                  <SelectItem key={i} value={String(i)}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Select value={String(selectedYear)} onValueChange={v => setSelectedYear(Number(v))}>
            <SelectTrigger className={`${filterMode === 'select_month' ? 'w-28' : 'w-full'} h-9 text-sm`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableYears.map(y => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Category breakdown */}
      {byCategory.length > 0 && (
        <div className="glass-card p-4 mb-4">
          <h2 className="text-xs font-semibold text-muted-foreground mb-3">{t('category_breakdown')}</h2>
          <div className="space-y-2">
            {byCategory.map(([cat, amount]) => (
              <div key={cat} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-base">{CATEGORY_ICONS[cat as Category] || '📦'}</span>
                  <span className="text-sm text-foreground">{cat}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-20 h-1.5 bg-muted/50 rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${(amount / total) * 100}%` }} />
                  </div>
                  <span className="text-sm font-semibold text-foreground w-20 text-right">{fmt(amount)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Daily breakdown */}
      <h2 className="text-xs font-semibold text-muted-foreground mb-3">{t('daily_spending')}</h2>
      {days.length === 0 ? (
        <div className="glass-card p-8 text-center">
          <p className="text-muted-foreground text-sm">{t('no_expenses')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {days.map(({ day, total: dayTotal, expenses: dayExpenses }) => {
            const dayKey = day.toISOString();
            const isOpen = expandedDay === dayKey;
            return (
              <div key={dayKey} className="glass-card overflow-hidden fade-in">
                <button
                  onClick={() => setExpandedDay(isOpen ? null : dayKey)}
                  className="w-full flex items-center justify-between p-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-muted/50 flex flex-col items-center justify-center">
                      <span className="text-xs font-bold text-foreground">{format(day, 'd')}</span>
                      <span className="text-[9px] text-muted-foreground">{format(day, 'EEE')}</span>
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-semibold text-foreground">{format(day, 'dd MMM')}</p>
                      <p className="text-xs text-muted-foreground">
                        {dayExpenses.length} {dayExpenses.length !== 1 ? t('transactions') : t('transaction')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-primary">{fmt(dayTotal)}</span>
                    {isOpen ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
                  </div>
                </button>
                {isOpen && (
                  <div className="px-3 pb-3 border-t border-border/50">
                    {dayExpenses.map(e => (
                      <div key={e.id} className="flex items-center justify-between py-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{CATEGORY_ICONS[e.category] || '📦'}</span>
                          <div>
                            <p className="text-xs font-medium text-foreground">{e.merchant || e.category}</p>
                            {e.note && <p className="text-[10px] text-muted-foreground truncate max-w-[150px]">{e.note}</p>}
                          </div>
                        </div>
                        <span className="text-xs font-semibold text-foreground">{fmt(e.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
