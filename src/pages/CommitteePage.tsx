import { useNavigate } from 'react-router-dom';
import { Plus, Users, ArrowRight, Crown } from 'lucide-react';
import { useCommittees } from '@/hooks/useCommittees';
import { useAuth } from '@/contexts/AuthContext';
import { format, parseISO } from 'date-fns';

export default function CommitteePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: committees = [], isLoading } = useCommittees();

  return (
    <div className="page-container">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-foreground">Committee</h1>
          <p className="text-xs text-muted-foreground">Chit fund style group savings</p>
        </div>
        <button
          onClick={() => navigate('/committee/new')}
          className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center"
          aria-label="Create committee"
        >
          <Plus size={18} className="text-primary-foreground" />
        </button>
      </div>

      {isLoading ? (
        <div className="glass-card p-8 text-center text-muted-foreground text-sm">Loading...</div>
      ) : committees.length === 0 ? (
        <div className="glass-card p-8 text-center fade-in">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center mb-3">
            <Users size={26} className="text-primary" />
          </div>
          <h2 className="text-base font-semibold text-foreground mb-1">No committees yet</h2>
          <p className="text-xs text-muted-foreground mb-4">
            Create a group where members contribute monthly and one person receives the pool.
          </p>
          <button
            onClick={() => navigate('/committee/new')}
            className="gradient-primary text-primary-foreground font-semibold px-5 py-2.5 rounded-xl text-sm"
          >
            Create your first committee
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {committees.map(c => {
            const isOrganizer = c.organizer_id === user?.id;
            const totalPool = Number(c.monthly_amount) * c.total_months;
            return (
              <button
                key={c.id}
                onClick={() => navigate(`/committee/${c.id}`)}
                className="glass-card w-full p-4 flex items-center gap-3 text-left hover:bg-muted/30 transition-colors fade-in"
              >
                <div className="w-11 h-11 rounded-xl gradient-primary flex items-center justify-center shrink-0">
                  <Users size={20} className="text-primary-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-semibold text-foreground truncate">{c.name}</p>
                    {isOrganizer && <Crown size={12} className="text-primary shrink-0" />}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    ₹{Number(c.monthly_amount).toLocaleString('en-IN')}/mo · {c.total_months} months · {c.payout_method === 'rotation' ? 'Rotation' : 'Draw'}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Started {format(parseISO(c.start_month), 'MMM yyyy')} · Pool ₹{totalPool.toLocaleString('en-IN')}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                    c.status === 'active' ? 'bg-success/20 text-success' : 'bg-muted/40 text-muted-foreground'
                  }`}>
                    {c.status}
                  </span>
                  <ArrowRight size={14} className="text-muted-foreground" />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
