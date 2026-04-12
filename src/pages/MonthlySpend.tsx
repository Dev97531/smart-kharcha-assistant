import { useState, useMemo } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval, eachDayOfInterval, isSameDay } from 'date-fns';
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react';
import { CATEGORY_ICONS, type Category } from '@/types/finance';

export default function MonthlySpend() {
  const { expenses } = useFinance();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [expandedDay, setExpandedDay] = useState<string | null>(null);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);

  const monthExpenses = useMemo(
    () => expenses.filter(e => isWithinInterval(parseISO(e.date), { start: monthStart, end: monthEnd })),
    [expenses, monthStart.toISOString()]
  );

  const monthTotal = monthExpenses.reduce((s, e) => s + e.amount, 0);

  const byCategory = useMemo(() => {
    const map: Record<string, number> = {};
    monthExpenses.forEach(e => { map[e.category] = (map[e.category] || 0) + e.amount; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [monthExpenses]);

  const days = useMemo(() => {
    const allDays = eachDayOfInterval({ start: monthStart, end: monthEnd > new Date() ? new Date() : monthEnd });
    return allDays.map(day => {
      const dayExpenses = monthExpenses.filter(e => isSameDay(parseISO(e.date), day));
      return { day, total: dayExpenses.reduce((s, e) => s + e.amount, 0), expenses: dayExpenses };
    }).filter(d => d.total > 0).reverse();
  }, [monthExpenses, monthStart.toISOString()]);

  const fmt = (n: number) => '₹' + n.toLocaleString('en-IN');

  const prevMonth = () => setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));

  return (
    <div className="page-container">
      {/* Month selector */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={prevMonth} className="w-9 h-9 rounded-xl bg-muted/50 flex items-center justify-center text-muted-foreground hover:text-foreground">
          <ChevronLeft size={18} />
        </button>
        <div className="text-center">
          <h1 className="text-lg font-bold text-foreground">{format(currentDate, 'MMMM yyyy')}</h1>
          <p className="text-2xl font-bold text-primary">{fmt(monthTotal)}</p>
        </div>
        <button onClick={nextMonth} className="w-9 h-9 rounded-xl bg-muted/50 flex items-center justify-center text-muted-foreground hover:text-foreground">
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Category breakdown */}
      {byCategory.length > 0 && (
        <div className="glass-card p-4 mb-4">
          <h2 className="text-xs font-semibold text-muted-foreground mb-3">Category Breakdown</h2>
          <div className="space-y-2">
            {byCategory.map(([cat, amount]) => (
              <div key={cat} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-base">{CATEGORY_ICONS[cat as Category] || '📦'}</span>
                  <span className="text-sm text-foreground">{cat}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-20 h-1.5 bg-muted/50 rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${(amount / monthTotal) * 100}%` }} />
                  </div>
                  <span className="text-sm font-semibold text-foreground w-20 text-right">{fmt(amount)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Daily breakdown */}
      <h2 className="text-xs font-semibold text-muted-foreground mb-3">Daily Spending</h2>
      {days.length === 0 ? (
        <div className="glass-card p-8 text-center">
          <p className="text-muted-foreground text-sm">No expenses this month</p>
        </div>
      ) : (
        <div className="space-y-2">
          {days.map(({ day, total, expenses: dayExpenses }) => {
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
                      <p className="text-xs text-muted-foreground">{dayExpenses.length} transaction{dayExpenses.length !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-primary">{fmt(total)}</span>
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
