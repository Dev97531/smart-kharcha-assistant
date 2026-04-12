import { useAuth } from '@/contexts/AuthContext';
import { useFinance } from '@/contexts/FinanceContext';
import { useBackup } from '@/hooks/useBackup';
import { LogOut, Cloud, Loader2, User, Mail, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { CATEGORY_ICONS, type Category } from '@/types/finance';
import { useMemo } from 'react';

export default function ProfilePage() {
  const { user, signOut } = useAuth();
  const { expenses, lending } = useFinance();
  const { backup, isBacking } = useBackup();

  const fmt = (n: number) => '₹' + n.toLocaleString('en-IN');

  const stats = useMemo(() => {
    const total = expenses.reduce((s, e) => s + e.amount, 0);
    const catMap: Record<string, number> = {};
    expenses.forEach(e => { catMap[e.category] = (catMap[e.category] || 0) + e.amount; });
    const topCategory = Object.entries(catMap).sort((a, b) => b[1] - a[1])[0];
    return {
      totalExpenses: expenses.length,
      totalSpent: total,
      totalLending: lending.length,
      activeLending: lending.filter(l => !l.settled).length,
      topCategory: topCategory ? topCategory[0] as Category : null,
      topCategoryAmount: topCategory ? topCategory[1] : 0,
    };
  }, [expenses, lending]);

  const avatar = user?.user_metadata?.avatar_url;
  const name = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';

  return (
    <div className="page-container">
      {/* Profile card */}
      <div className="glass-card p-6 text-center mb-4 fade-in">
        <div className="w-20 h-20 rounded-full mx-auto mb-3 overflow-hidden bg-muted/50 flex items-center justify-center">
          {avatar ? (
            <img src={avatar} alt={name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <User size={32} className="text-muted-foreground" />
          )}
        </div>
        <h1 className="text-lg font-bold text-foreground">{name}</h1>
        <div className="flex items-center justify-center gap-1.5 mt-1">
          <Mail size={12} className="text-muted-foreground" />
          <p className="text-xs text-muted-foreground">{user?.email}</p>
        </div>
        {user?.created_at && (
          <div className="flex items-center justify-center gap-1.5 mt-1">
            <Calendar size={12} className="text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Joined {format(new Date(user.created_at), 'MMM yyyy')}</p>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="stat-card fade-in">
          <span className="text-xs text-muted-foreground">Total Expenses</span>
          <p className="text-xl font-bold text-foreground">{stats.totalExpenses}</p>
        </div>
        <div className="stat-card fade-in">
          <span className="text-xs text-muted-foreground">Total Spent</span>
          <p className="text-xl font-bold text-primary">{fmt(stats.totalSpent)}</p>
        </div>
        <div className="stat-card fade-in">
          <span className="text-xs text-muted-foreground">Active Lending</span>
          <p className="text-xl font-bold text-accent">{stats.activeLending}</p>
        </div>
        <div className="stat-card fade-in">
          <span className="text-xs text-muted-foreground">Top Category</span>
          <p className="text-lg font-bold text-foreground">
            {stats.topCategory ? `${CATEGORY_ICONS[stats.topCategory]} ${stats.topCategory}` : '—'}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-2">
        <button
          onClick={backup}
          disabled={isBacking}
          className="w-full glass-card p-4 flex items-center gap-3 hover:bg-muted/30 transition-colors disabled:opacity-50"
        >
          {isBacking ? <Loader2 size={18} className="animate-spin text-primary" /> : <Cloud size={18} className="text-primary" />}
          <div className="text-left">
            <p className="text-sm font-medium text-foreground">Backup to Cloud</p>
            <p className="text-xs text-muted-foreground">Save your data securely</p>
          </div>
        </button>

        <button
          onClick={signOut}
          className="w-full glass-card p-4 flex items-center gap-3 hover:bg-destructive/10 transition-colors"
        >
          <LogOut size={18} className="text-destructive" />
          <div className="text-left">
            <p className="text-sm font-medium text-destructive">Sign Out</p>
            <p className="text-xs text-muted-foreground">Log out of your account</p>
          </div>
        </button>
      </div>
    </div>
  );
}
