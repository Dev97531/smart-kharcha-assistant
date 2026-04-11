import { useState } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { format, parseISO } from 'date-fns';
import { Plus, Check, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';

export default function LendingPage() {
  const { lending, addLending, settleLending, deleteLending } = useFinance();
  const [showForm, setShowForm] = useState(false);
  const [type, setType] = useState<'lent' | 'borrowed'>('lent');
  const [person, setPerson] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  const handleAdd = () => {
    const amt = parseFloat(amount);
    if (!person.trim() || !amt || amt <= 0) {
      toast.error('Fill in person and amount');
      return;
    }
    addLending({
      type,
      person: person.trim(),
      amount: amt,
      remainingAmount: amt,
      date: new Date().toISOString(),
      note: note || undefined,
      settled: false,
    });
    toast.success(`${type === 'lent' ? 'Lent' : 'Borrowed'} ₹${amt} ${type === 'lent' ? 'to' : 'from'} ${person}`);
    setPerson(''); setAmount(''); setNote(''); setShowForm(false);
  };

  const active = lending.filter(l => !l.settled);
  const settled = lending.filter(l => l.settled);

  return (
    <div className="page-container">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-foreground">Lending & Borrowing</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center"
        >
          {showForm ? <X size={18} className="text-primary-foreground" /> : <Plus size={18} className="text-primary-foreground" />}
        </button>
      </div>

      {showForm && (
        <div className="glass-card p-4 mb-4 space-y-3 fade-in">
          <div className="flex gap-2">
            {(['lent', 'borrowed'] as const).map(t => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
                  type === t ? 'bg-primary/20 text-primary ring-1 ring-primary' : 'bg-muted/30 text-muted-foreground'
                }`}
              >
                {t === 'lent' ? 'I Gave' : 'I Borrowed'}
              </button>
            ))}
          </div>
          <input value={person} onChange={e => setPerson(e.target.value)} placeholder="Person name" className="w-full bg-muted/50 rounded-xl px-3 py-2.5 text-sm text-foreground outline-none" />
          <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Amount" className="w-full bg-muted/50 rounded-xl px-3 py-2.5 text-sm text-foreground outline-none" />
          <input value={note} onChange={e => setNote(e.target.value)} placeholder="Note (optional)" className="w-full bg-muted/50 rounded-xl px-3 py-2.5 text-sm text-foreground outline-none" />
          <button onClick={handleAdd} className="w-full gradient-primary text-primary-foreground font-semibold py-3 rounded-xl text-sm">
            Add Record
          </button>
        </div>
      )}

      {active.length === 0 && !showForm ? (
        <div className="glass-card p-8 text-center text-muted-foreground text-sm">No active records</div>
      ) : (
        <div className="space-y-2 mb-6">
          {active.map(l => (
            <div key={l.id} className="glass-card p-3 flex items-center gap-3 fade-in">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold ${
                l.type === 'lent' ? 'bg-success/20 text-success' : 'bg-destructive/20 text-destructive'
              }`}>
                {l.person[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{l.person}</p>
                <p className="text-xs text-muted-foreground">
                  {l.type === 'lent' ? 'You gave' : 'You owe'} · {format(parseISO(l.date), 'dd MMM')}
                </p>
              </div>
              <p className={`text-sm font-bold ${l.type === 'lent' ? 'text-success' : 'text-destructive'}`}>
                ₹{l.remainingAmount.toLocaleString('en-IN')}
              </p>
              <button onClick={() => { settleLending(l.id); toast.success('Settled!'); }} className="text-muted-foreground hover:text-success p-1">
                <Check size={16} />
              </button>
              <button onClick={() => deleteLending(l.id)} className="text-muted-foreground hover:text-destructive p-1">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {settled.length > 0 && (
        <>
          <h2 className="text-sm font-semibold text-muted-foreground mb-2">Settled</h2>
          <div className="space-y-2 opacity-60">
            {settled.slice(0, 5).map(l => (
              <div key={l.id} className="glass-card p-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-muted/30 flex items-center justify-center text-xs font-bold text-muted-foreground">
                  {l.person[0]?.toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground line-through">{l.person}</p>
                </div>
                <p className="text-sm text-muted-foreground">₹{l.amount.toLocaleString('en-IN')}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
