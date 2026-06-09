import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useCreateCommittee } from '@/hooks/useCommittees';
import type { PayoutMethod } from '@/types/committee';

export default function CreateCommitteePage() {
  const navigate = useNavigate();
  const create = useCreateCommittee();
  const [name, setName] = useState('');
  const [monthlyAmount, setMonthlyAmount] = useState('');
  const [totalMonths, setTotalMonths] = useState('');
  const [startMonth, setStartMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [payoutMethod, setPayoutMethod] = useState<PayoutMethod>('rotation');
  const [note, setNote] = useState('');
  const [members, setMembers] = useState<{ name: string; phone: string }[]>([{ name: '', phone: '' }]);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const addMemberRow = () => setMembers(prev => [...prev, { name: '', phone: '' }]);
  const updateMember = (i: number, k: 'name' | 'phone', v: string) =>
    setMembers(prev => prev.map((m, idx) => idx === i ? { ...m, [k]: v } : m));
  const removeMember = (i: number) =>
    setMembers(prev => prev.filter((_, idx) => idx !== i));

  const validate = () => {
    if (!name.trim()) return 'Name is required';
    const amt = Number(monthlyAmount);
    if (!amt || amt <= 0) return 'Monthly amount must be greater than 0';
    const mo = Number(totalMonths);
    if (!mo || mo <= 0 || mo > 120) return 'Months must be between 1 and 120';
    if (!startMonth) return 'Pick a start month';
    const valid = members.filter(m => m.name.trim());
    if (valid.length === 0) return 'Add at least one other member';
    return null;
  };

  const handleAttemptSave = () => {
    const err = validate();
    if (err) { toast.error(err); return; }
    setConfirmOpen(true);
  };

  const handleConfirmSave = async () => {
    setConfirmOpen(false);
    try {
      const committee = await create.mutateAsync({
        name: name.trim(),
        monthly_amount: Number(monthlyAmount),
        total_months: Number(totalMonths),
        start_month: `${startMonth}-01`,
        payout_method: payoutMethod,
        note: note.trim() || undefined,
        members: members
          .filter(m => m.name.trim())
          .map(m => ({ name: m.name.trim(), phone: m.phone.trim() || undefined })),
      });
      toast.success('Committee created!');
      navigate(`/committee/${committee.id}`, { replace: true });
    } catch (e: any) {
      toast.error(e.message || 'Could not create committee');
    }
  };

  return (
    <div className="page-container">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl bg-muted/50 flex items-center justify-center">
          <ArrowLeft size={18} className="text-foreground" />
        </button>
        <h1 className="text-lg font-bold text-foreground">New Committee</h1>
      </div>

      <div className="space-y-4">
        <div className="glass-card p-4 space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Committee name</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={80}
              placeholder="e.g. Office Saving Group"
              className="w-full mt-1 bg-muted/50 rounded-xl px-3 py-2.5 text-sm text-foreground outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Monthly amount (₹)</label>
              <input
                type="number" inputMode="numeric"
                value={monthlyAmount}
                onChange={e => setMonthlyAmount(e.target.value)}
                placeholder="5000"
                className="w-full mt-1 bg-muted/50 rounded-xl px-3 py-2.5 text-sm text-foreground outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Total months</label>
              <input
                type="number" inputMode="numeric"
                value={totalMonths}
                onChange={e => setTotalMonths(e.target.value)}
                placeholder="12"
                className="w-full mt-1 bg-muted/50 rounded-xl px-3 py-2.5 text-sm text-foreground outline-none"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Start month</label>
            <input
              type="month"
              value={startMonth}
              onChange={e => setStartMonth(e.target.value)}
              className="w-full mt-1 bg-muted/50 rounded-xl px-3 py-2.5 text-sm text-foreground outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Payout method</label>
            <div className="flex gap-2 mt-1">
              {(['rotation', 'draw'] as const).map(m => (
                <button
                  key={m}
                  onClick={() => setPayoutMethod(m)}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
                    payoutMethod === m ? 'bg-primary/20 text-primary ring-1 ring-primary' : 'bg-muted/30 text-muted-foreground'
                  }`}
                >
                  {m === 'rotation' ? 'Rotation' : 'Draw'}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Note (optional)</label>
            <input
              value={note}
              onChange={e => setNote(e.target.value)}
              maxLength={200}
              placeholder="Any group rules..."
              className="w-full mt-1 bg-muted/50 rounded-xl px-3 py-2.5 text-sm text-foreground outline-none"
            />
          </div>
        </div>

        <div className="glass-card p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Members</h2>
              <p className="text-[11px] text-muted-foreground">You are added as organizer automatically.</p>
            </div>
            <button
              onClick={addMemberRow}
              className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center text-primary"
            >
              <Plus size={16} />
            </button>
          </div>
          <div className="space-y-2">
            {members.map((m, i) => (
              <div key={i} className="flex gap-2 items-center">
                <input
                  value={m.name}
                  onChange={e => updateMember(i, 'name', e.target.value)}
                  maxLength={60}
                  placeholder={`Member ${i + 1} name`}
                  className="flex-1 bg-muted/50 rounded-xl px-3 py-2 text-sm text-foreground outline-none"
                />
                <input
                  value={m.phone}
                  onChange={e => updateMember(i, 'phone', e.target.value)}
                  maxLength={20}
                  placeholder="Phone"
                  className="w-24 bg-muted/50 rounded-xl px-3 py-2 text-sm text-foreground outline-none"
                />
                {members.length > 1 && (
                  <button
                    onClick={() => removeMember(i)}
                    className="w-8 h-8 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={handleAttemptSave}
          disabled={create.isPending}
          className="w-full gradient-primary text-primary-foreground font-semibold py-3 rounded-xl text-sm disabled:opacity-60"
        >
          {create.isPending ? 'Creating...' : 'Review & Create'}
        </button>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Create this committee?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="block">{name} — ₹{Number(monthlyAmount || 0).toLocaleString('en-IN')}/month for {totalMonths} months.</span>
              <span className="block mt-1">Payout: {payoutMethod === 'rotation' ? 'Rotation' : 'Draw'}.</span>
              <span className="block mt-1">{members.filter(m => m.name.trim()).length} member(s) + you as organizer.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Review again</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSave}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
