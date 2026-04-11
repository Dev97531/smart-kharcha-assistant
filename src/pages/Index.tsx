import { SummaryCards } from '@/components/SummaryCards';
import { DonutChart } from '@/components/DonutChart';
import { RecentTransactions } from '@/components/RecentTransactions';
import { useFinance } from '@/contexts/FinanceContext';
import { useNavigate } from 'react-router-dom';
import { Mic, Plus } from 'lucide-react';

export default function Dashboard() {
  const { todayTotal, monthTotal, todayByCategory, monthByCategory } = useFinance();
  const navigate = useNavigate();

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-bold text-foreground">Smart Kharcha</h1>
          <p className="text-xs text-muted-foreground">Your AI Finance Assistant</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/add')}
            className="w-9 h-9 rounded-xl bg-muted/50 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <Plus size={20} />
          </button>
        </div>
      </div>

      {/* Summary */}
      <SummaryCards />

      {/* Charts */}
      <div className="grid grid-cols-2 gap-3 mt-4">
        <DonutChart data={todayByCategory} title="Today" total={todayTotal} />
        <DonutChart data={monthByCategory} title="This Month" total={monthTotal} />
      </div>

      {/* Floating mic */}
      <button
        onClick={() => navigate('/add')}
        className="mic-button w-14 h-14 fixed bottom-24 right-5 z-40"
      >
        <Mic size={24} className="text-primary-foreground" />
      </button>

      {/* Recent */}
      <div className="mt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-muted-foreground">Recent Transactions</h2>
        </div>
        <RecentTransactions limit={10} />
      </div>
    </div>
  );
}
