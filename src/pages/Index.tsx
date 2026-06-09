import { useState } from 'react';
import { SummaryCards } from '@/components/SummaryCards';
import { DonutChart } from '@/components/DonutChart';
import { RecentTransactions } from '@/components/RecentTransactions';
import { VoiceOrb } from '@/components/VoiceOrb';
import { useFinance } from '@/contexts/FinanceContext';
import { useAuth } from '@/contexts/AuthContext';
import { useBackup } from '@/hooks/useBackup';
import { useNavigate } from 'react-router-dom';
import { Mic, Plus, Cloud, Sun, Moon, Loader2 } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';

export default function Dashboard() {
  const { todayTotal, monthTotal, todayByCategory, monthByCategory } = useFinance();
  const { user } = useAuth();
  const { backup, isBacking } = useBackup();
  const { isDark, toggle: toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [voiceOpen, setVoiceOpen] = useState(false);

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-bold text-foreground">Smart Kharcha with AI</h1>
          <p className="text-xs text-muted-foreground truncate max-w-[180px]">
            {user?.email || 'Your AI Finance Assistant'}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={backup}
            disabled={isBacking}
            title="Backup to cloud"
            className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
          >
            {isBacking ? <Loader2 size={16} className="animate-spin" /> : <Cloud size={16} />}
          </button>
          <button
            onClick={toggleTheme}
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          >
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button
            onClick={() => navigate('/add')}
            className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <Plus size={16} />
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

      {/* Floating mic — launches voice orb */}
      <button
        onClick={() => setVoiceOpen(true)}
        className="mic-button w-14 h-14 fixed bottom-24 right-5 z-40 hover:scale-105 transition-transform"
      >
        <Mic size={24} className="text-primary-foreground" />
      </button>

      {/* Voice Orb overlay */}
      <VoiceOrb open={voiceOpen} onClose={() => setVoiceOpen(false)} />

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
