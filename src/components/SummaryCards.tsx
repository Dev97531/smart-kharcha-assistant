import { useFinance } from '@/contexts/FinanceContext';
import { TrendingDown, TrendingUp, ArrowDownLeft, ArrowUpRight } from 'lucide-react';

export function SummaryCards() {
  const { todayTotal, monthTotal, toReceive, toPay } = useFinance();

  const fmt = (n: number) => '₹' + n.toLocaleString('en-IN');

  const cards = [
    { label: 'Today', value: fmt(todayTotal), icon: TrendingDown, color: 'text-primary' },
    { label: 'This Month', value: fmt(monthTotal), icon: TrendingUp, color: 'text-accent' },
    { label: 'To Receive', value: fmt(toReceive), icon: ArrowDownLeft, color: 'text-success' },
    { label: 'To Pay', value: fmt(toPay), icon: ArrowUpRight, color: 'text-destructive' },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {cards.map(({ label, value, icon: Icon, color }) => (
        <div key={label} className="stat-card fade-in">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">{label}</span>
            <Icon size={16} className={color} />
          </div>
          <p className={`text-xl font-bold ${color}`}>{value}</p>
        </div>
      ))}
    </div>
  );
}
