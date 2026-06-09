import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Crown, Trash2, Check, Banknote, Smartphone, Users } from 'lucide-react';
import { addMonths, format, parseISO } from 'date-fns';
import { toast } from 'sonner';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import {
  useCommittee, useCommitteeMembers, useCommitteeContributions,
  useCommitteePayouts, useCommitteeRealtime, useMarkContribution,
  useRecordPayout, useDeleteCommittee,
} from '@/hooks/useCommittees';
import type { CommitteeMember, ContributionMethod } from '@/types/committee';

function MethodBadge({ method }: { method?: ContributionMethod | null }) {
  if (!method) return null;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md font-medium ${
      method === 'online' ? 'bg-primary/15 text-primary' : 'bg-accent/15 text-accent'
    }`}>
      {method === 'online' ? <Smartphone size={10} /> : <Banknote size={10} />}
      {method === 'online' ? 'Online' : 'Cash'}
    </span>
  );
}

export default function CommitteeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  useCommitteeRealtime(id);

  const { data: committee, isLoading } = useCommittee(id);
  const { data: members = [] } = useCommitteeMembers(id);
  const { data: contributions = [] } = useCommitteeContributions(id);
  const { data: payouts = [] } = useCommitteePayouts(id);

  const markContribution = useMarkContribution();
  const recordPayout = useRecordPayout();
  const deleteCommittee = useDeleteCommittee();

  const [selectedMonth, setSelectedMonth] = useState<number>(1);
  const [payoutDialog, setPayoutDialog] = useState<{ open: boolean; month: number } | null>(null);
  const [payoutRecipient, setPayoutRecipient] = useState<string>('');
  const [payoutMethod, setPayoutMethod] = useState<ContributionMethod>('online');
  const [payoutDate, setPayoutDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [payoutNote, setPayoutNote] = useState('');
  const [payoutConfirm, setPayoutConfirm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const isOrganizer = !!committee && committee.organizer_id === user?.id;

  const monthList = useMemo(() => {
    if (!committee) return [] as { month_number: number; label: string; date: Date }[];
    const start = parseISO(committee.start_month);
    return Array.from({ length: committee.total_months }, (_, i) => ({
      month_number: i + 1,
      label: format(addMonths(start, i), 'MMM yyyy'),
      date: addMonths(start, i),
    }));
  }, [committee]);

  const contributionsMap = useMemo(() => {
    const m = new Map<string, typeof contributions[number]>();
    contributions.forEach(c => m.set(`${c.member_id}:${c.month_number}`, c));
    return m;
  }, [contributions]);

  const payoutsByMonth = useMemo(() => {
    const m = new Map<number, typeof payouts[number]>();
    payouts.forEach(p => m.set(p.month_number, p));
    return m;
  }, [payouts]);

  if (isLoading) {
    return <div className="page-container"><div className="glass-card p-8 text-center text-muted-foreground text-sm">Loading...</div></div>;
  }
  if (!committee) {
    return (
      <div className="page-container">
        <div className="glass-card p-8 text-center text-muted-foreground text-sm">
          Committee not found.
          <button onClick={() => navigate('/committee')} className="mt-3 block mx-auto text-primary text-sm font-medium">Back to committees</button>
        </div>
      </div>
    );
  }

  const monthly = Number(committee.monthly_amount);
  const monthsCompleted = payouts.length;

  const handleToggleContribution = async (member: CommitteeMember, monthNum: number) => {
    if (!isOrganizer) return;
    const existing = contributionsMap.get(`${member.id}:${monthNum}`);
    const nextPaid = !(existing?.paid);
    try {
      await markContribution.mutateAsync({
        committee_id: committee.id,
        member_id: member.id,
        month_number: monthNum,
        paid: nextPaid,
        method: nextPaid ? (existing?.method ?? 'online') : undefined,
      });
      toast.success(nextPaid ? `Marked ${member.name} paid` : `Marked ${member.name} unpaid`);
    } catch (e: any) {
      toast.error(e.message || 'Could not update');
    }
  };

  const handleSetMethod = async (member: CommitteeMember, monthNum: number, method: ContributionMethod) => {
    if (!isOrganizer) return;
    const existing = contributionsMap.get(`${member.id}:${monthNum}`);
    try {
      await markContribution.mutateAsync({
        committee_id: committee.id,
        member_id: member.id,
        month_number: monthNum,
        paid: true,
        method,
        paid_on: existing?.paid_on ?? undefined,
      });
    } catch (e: any) {
      toast.error(e.message || 'Could not update');
    }
  };

  const openPayoutDialog = (monthNum: number) => {
    if (!isOrganizer) return;
    const existing = payoutsByMonth.get(monthNum);
    setPayoutRecipient(existing?.recipient_member_id ?? '');
    setPayoutMethod(existing?.method ?? 'online');
    setPayoutDate(existing?.payout_date ?? new Date().toISOString().slice(0, 10));
    setPayoutNote(existing?.note ?? '');
    setPayoutDialog({ open: true, month: monthNum });
  };

  const handleSavePayout = async () => {
    if (!payoutDialog) return;
    if (!payoutRecipient) { toast.error('Pick a recipient'); return; }
    setPayoutConfirm(true);
  };

  const handleConfirmPayout = async () => {
    if (!payoutDialog) return;
    setPayoutConfirm(false);
    try {
      await recordPayout.mutateAsync({
        committee_id: committee.id,
        month_number: payoutDialog.month,
        recipient_member_id: payoutRecipient,
        payout_date: payoutDate,
        method: payoutMethod,
        amount: monthly * members.length,
        note: payoutNote.trim() || undefined,
      });
      toast.success('Payout recorded');
      setPayoutDialog(null);
    } catch (e: any) {
      toast.error(e.message || 'Could not save payout');
    }
  };

  const handleDelete = async () => {
    setDeleteConfirm(false);
    try {
      await deleteCommittee.mutateAsync(committee.id);
      toast.success('Committee deleted');
      navigate('/committee', { replace: true });
    } catch (e: any) {
      toast.error(e.message || 'Could not delete');
    }
  };

  // Pool per draw = monthly * members count (organizer included)
  const poolPerDraw = monthly * members.length;

  return (
    <div className="page-container">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => navigate('/committee')} className="w-9 h-9 rounded-xl bg-muted/50 flex items-center justify-center">
          <ArrowLeft size={18} className="text-foreground" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-foreground truncate">{committee.name}</h1>
          <p className="text-[11px] text-muted-foreground truncate flex items-center gap-1">
            <Crown size={10} className="text-primary" /> Organizer: {committee.organizer_name}
          </p>
        </div>
        {isOrganizer && (
          <button onClick={() => setDeleteConfirm(true)} className="w-9 h-9 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center">
            <Trash2 size={16} />
          </button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="stat-card">
          <span className="text-[10px] text-muted-foreground">Monthly</span>
          <p className="text-sm font-bold text-foreground">₹{monthly.toLocaleString('en-IN')}</p>
        </div>
        <div className="stat-card">
          <span className="text-[10px] text-muted-foreground">Per Draw</span>
          <p className="text-sm font-bold text-primary">₹{poolPerDraw.toLocaleString('en-IN')}</p>
        </div>
        <div className="stat-card">
          <span className="text-[10px] text-muted-foreground">Progress</span>
          <p className="text-sm font-bold text-foreground">{monthsCompleted}/{committee.total_months}</p>
        </div>
      </div>

      <Tabs defaultValue="schedule" className="w-full">
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
          <TabsTrigger value="contributions">Contributions</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
        </TabsList>

        <TabsContent value="schedule" className="space-y-2 mt-3">
          {monthList.map(m => {
            const payout = payoutsByMonth.get(m.month_number);
            const recipient = payout ? members.find(x => x.id === payout.recipient_member_id) : null;
            return (
              <div key={m.month_number} className="glass-card p-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-muted/40 flex flex-col items-center justify-center shrink-0">
                  <span className="text-[9px] text-muted-foreground leading-none">M{m.month_number}</span>
                  <span className="text-[10px] font-semibold text-foreground leading-tight">{format(m.date, 'MMM')}</span>
                </div>
                <div className="flex-1 min-w-0">
                  {payout ? (
                    <>
                      <p className="text-sm font-medium text-foreground truncate">
                        {recipient?.name ?? 'Unknown'} received ₹{Number(payout.amount).toLocaleString('en-IN')}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-muted-foreground">{format(parseISO(payout.payout_date), 'dd MMM yyyy')}</span>
                        <MethodBadge method={payout.method} />
                      </div>
                    </>
                  ) : (
                    <p className="text-xs text-muted-foreground">Not yet paid out</p>
                  )}
                </div>
                {isOrganizer && (
                  <button
                    onClick={() => openPayoutDialog(m.month_number)}
                    className="text-xs font-medium text-primary px-2 py-1 rounded-lg bg-primary/10"
                  >
                    {payout ? 'Edit' : 'Record'}
                  </button>
                )}
              </div>
            );
          })}
        </TabsContent>

        <TabsContent value="contributions" className="mt-3">
          <div className="glass-card p-3 mb-3 flex items-center gap-2 overflow-x-auto">
            <span className="text-xs text-muted-foreground shrink-0">Month:</span>
            {monthList.map(m => (
              <button
                key={m.month_number}
                onClick={() => setSelectedMonth(m.month_number)}
                className={`shrink-0 text-[11px] px-2.5 py-1 rounded-lg font-medium ${
                  selectedMonth === m.month_number ? 'bg-primary text-primary-foreground' : 'bg-muted/40 text-muted-foreground'
                }`}
              >
                M{m.month_number}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            {members.map(member => {
              const c = contributionsMap.get(`${member.id}:${selectedMonth}`);
              const paid = !!c?.paid;
              return (
                <div key={member.id} className="glass-card p-3 flex items-center gap-3">
                  <button
                    onClick={() => handleToggleContribution(member, selectedMonth)}
                    disabled={!isOrganizer}
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                      paid ? 'bg-success/20 text-success' : 'bg-muted/40 text-muted-foreground'
                    } ${!isOrganizer ? 'opacity-70 cursor-default' : ''}`}
                  >
                    <Check size={16} />
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{member.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {paid && c?.paid_on ? `Paid ${format(parseISO(c.paid_on), 'dd MMM')}` : 'Pending'}
                    </p>
                  </div>
                  {paid && (
                    <div className="flex gap-1">
                      {(['online', 'cash'] as const).map(mth => (
                        <button
                          key={mth}
                          onClick={() => handleSetMethod(member, selectedMonth, mth)}
                          disabled={!isOrganizer}
                          className={`text-[10px] px-2 py-1 rounded-md font-medium transition-colors ${
                            c?.method === mth
                              ? mth === 'online' ? 'bg-primary text-primary-foreground' : 'bg-accent text-accent-foreground'
                              : 'bg-muted/40 text-muted-foreground'
                          } ${!isOrganizer ? 'opacity-70 cursor-default' : ''}`}
                        >
                          {mth === 'online' ? 'Online' : 'Cash'}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="members" className="space-y-2 mt-3">
          {members.map(m => (
            <div key={m.id} className="glass-card p-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center text-sm font-bold text-primary">
                {m.name[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate flex items-center gap-1.5">
                  {m.name}
                  {m.user_id === committee.organizer_id && <Crown size={12} className="text-primary" />}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {m.phone || 'No phone'} · Order #{m.rotation_order ?? '-'}
                </p>
              </div>
            </div>
          ))}
          {members.length === 0 && (
            <div className="glass-card p-6 text-center text-muted-foreground text-sm flex flex-col items-center gap-2">
              <Users size={20} /> No members yet
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Record payout dialog */}
      <Dialog open={!!payoutDialog?.open} onOpenChange={(o) => !o && setPayoutDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record payout — Month {payoutDialog?.month}</DialogTitle>
            <DialogDescription>Who received the lump sum this month?</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Recipient</label>
              <select
                value={payoutRecipient}
                onChange={e => setPayoutRecipient(e.target.value)}
                className="w-full mt-1 bg-muted/50 rounded-xl px-3 py-2.5 text-sm text-foreground outline-none"
              >
                <option value="">Select member...</option>
                {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Date</label>
                <input
                  type="date"
                  value={payoutDate}
                  onChange={e => setPayoutDate(e.target.value)}
                  className="w-full mt-1 bg-muted/50 rounded-xl px-3 py-2.5 text-sm text-foreground outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Method</label>
                <div className="flex gap-2 mt-1">
                  {(['online', 'cash'] as const).map(mth => (
                    <button
                      key={mth}
                      onClick={() => setPayoutMethod(mth)}
                      className={`flex-1 py-2 rounded-xl text-xs font-medium ${
                        payoutMethod === mth ? 'bg-primary text-primary-foreground' : 'bg-muted/40 text-muted-foreground'
                      }`}
                    >
                      {mth === 'online' ? 'Online' : 'Cash'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Note</label>
              <input
                value={payoutNote}
                onChange={e => setPayoutNote(e.target.value)}
                maxLength={200}
                placeholder="UPI ref, cash handed over..."
                className="w-full mt-1 bg-muted/50 rounded-xl px-3 py-2.5 text-sm text-foreground outline-none"
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              Amount will be recorded as ₹{poolPerDraw.toLocaleString('en-IN')} (₹{monthly.toLocaleString('en-IN')} × {members.length} members).
            </p>
          </div>
          <DialogFooter>
            <button onClick={() => setPayoutDialog(null)} className="text-sm px-4 py-2 rounded-xl bg-muted/40 text-muted-foreground">Cancel</button>
            <button onClick={handleSavePayout} className="text-sm px-4 py-2 rounded-xl gradient-primary text-primary-foreground font-semibold">Save</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={payoutConfirm} onOpenChange={setPayoutConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm payout</AlertDialogTitle>
            <AlertDialogDescription>
              Save that {members.find(m => m.id === payoutRecipient)?.name} received ₹{poolPerDraw.toLocaleString('en-IN')} via {payoutMethod} on {format(parseISO(payoutDate), 'dd MMM yyyy')}? All members will see this update.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Back</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmPayout}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteConfirm} onOpenChange={setDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete committee?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes {committee.name}, all members, contributions and payout history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
