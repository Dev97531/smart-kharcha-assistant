import { useFinance } from '@/contexts/FinanceContext';
import { CATEGORY_ICONS, type Category } from '@/types/finance';
import { format, parseISO } from 'date-fns';
import { Trash2 } from 'lucide-react';

export function RecentTransactions({ limit, category }: { limit?: number; category?: Category }) {
  const { expenses, deleteExpense } = useFinance();

  let filtered = category ? expenses.filter(e => e.category === category) : expenses;
  if (limit) filtered = filtered.slice(0, limit);

  if (filtered.length === 0) {
    return (
      <div className="glass-card p-6 text-center text-muted-foreground text-sm fade-in">
        No transactions yet
      </div>
    );
  }

  return (
    <div className="space-y-2 fade-in">
      {filtered.map(e => (
        <div key={e.id} className="glass-card p-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center text-lg">
            {CATEGORY_ICONS[e.category]}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {e.merchant || e.note || e.category}
            </p>
            <p className="text-xs text-muted-foreground">
              {e.category} · {format(parseISO(e.date), 'dd MMM')}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-sm font-bold text-foreground">-₹{e.amount.toLocaleString('en-IN')}</p>
          </div>
          <button
            onClick={() => deleteExpense(e.id)}
            className="text-muted-foreground hover:text-destructive p-1 transition-colors"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
