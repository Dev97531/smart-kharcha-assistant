import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type {
  Committee, CommitteeMember, CommitteeContribution, CommitteePayout,
  PayoutMethod, ContributionMethod,
} from '@/types/committee';

/** All committees the current user can see (organizer + member-linked). */
export function useCommittees() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['committees'],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('committees' as any)
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Committee[];
    },
  });
}

export function useCommittee(committeeId: string | undefined) {
  return useQuery({
    queryKey: ['committee', committeeId],
    enabled: !!committeeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('committees' as any)
        .select('*')
        .eq('id', committeeId!)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as Committee | null;
    },
  });
}

export function useCommitteeMembers(committeeId: string | undefined) {
  return useQuery({
    queryKey: ['committee-members', committeeId],
    enabled: !!committeeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('committee_members' as any)
        .select('*')
        .eq('committee_id', committeeId!)
        .order('rotation_order', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as CommitteeMember[];
    },
  });
}

export function useCommitteeContributions(committeeId: string | undefined) {
  return useQuery({
    queryKey: ['committee-contributions', committeeId],
    enabled: !!committeeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('committee_contributions' as any)
        .select('*')
        .eq('committee_id', committeeId!);
      if (error) throw error;
      return (data ?? []) as unknown as CommitteeContribution[];
    },
  });
}

export function useCommitteePayouts(committeeId: string | undefined) {
  return useQuery({
    queryKey: ['committee-payouts', committeeId],
    enabled: !!committeeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('committee_payouts' as any)
        .select('*')
        .eq('committee_id', committeeId!)
        .order('month_number', { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as CommitteePayout[];
    },
  });
}

/** Subscribes to realtime updates for a committee and refreshes related queries. */
export function useCommitteeRealtime(committeeId: string | undefined) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!committeeId) return;
    const channel = supabase
      .channel(`committee-${committeeId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'committee_members', filter: `committee_id=eq.${committeeId}` },
        () => qc.invalidateQueries({ queryKey: ['committee-members', committeeId] }))
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'committee_contributions', filter: `committee_id=eq.${committeeId}` },
        () => qc.invalidateQueries({ queryKey: ['committee-contributions', committeeId] }))
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'committee_payouts', filter: `committee_id=eq.${committeeId}` },
        () => qc.invalidateQueries({ queryKey: ['committee-payouts', committeeId] }))
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'committees', filter: `id=eq.${committeeId}` },
        () => {
          qc.invalidateQueries({ queryKey: ['committee', committeeId] });
          qc.invalidateQueries({ queryKey: ['committees'] });
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [committeeId, qc]);
}

export interface CreateCommitteeInput {
  name: string;
  monthly_amount: number;
  total_months: number;
  start_month: string;
  payout_method: PayoutMethod;
  note?: string;
  members: { name: string; phone?: string }[];
}

export function useCreateCommittee() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: CreateCommitteeInput) => {
      if (!user) throw new Error('Not signed in');
      const organizerName =
        (user.user_metadata as any)?.full_name ||
        user.email?.split('@')[0] ||
        'Organizer';

      const { data: committee, error: cErr } = await supabase
        .from('committees' as any)
        .insert({
          name: input.name,
          monthly_amount: input.monthly_amount,
          total_months: input.total_months,
          start_month: input.start_month,
          payout_method: input.payout_method,
          organizer_id: user.id,
          organizer_name: organizerName,
          note: input.note,
        })
        .select()
        .single();
      if (cErr) throw cErr;
      const committeeRow = committee as unknown as Committee;

      // Add organizer as member #1 + provided members
      const memberRows = [
        { committee_id: committeeRow.id, name: organizerName, user_id: user.id, rotation_order: 1 },
        ...input.members.map((m, idx) => ({
          committee_id: committeeRow.id,
          name: m.name,
          phone: m.phone || null,
          rotation_order: idx + 2,
        })),
      ];
      const { error: mErr } = await supabase.from('committee_members' as any).insert(memberRows);
      if (mErr) throw mErr;
      return committeeRow;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['committees'] });
    },
  });
}

export function useMarkContribution() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      committee_id: string;
      member_id: string;
      month_number: number;
      paid: boolean;
      method?: ContributionMethod;
      paid_on?: string;
      note?: string;
    }) => {
      const { error } = await supabase
        .from('committee_contributions' as any)
        .upsert(
          {
            committee_id: input.committee_id,
            member_id: input.member_id,
            month_number: input.month_number,
            paid: input.paid,
            method: input.method ?? null,
            paid_on: input.paid ? (input.paid_on ?? new Date().toISOString().slice(0, 10)) : null,
            note: input.note ?? null,
            marked_by: user?.id ?? null,
          },
          { onConflict: 'committee_id,member_id,month_number' }
        );
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['committee-contributions', vars.committee_id] });
    },
  });
}

export function useRecordPayout() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      committee_id: string;
      month_number: number;
      recipient_member_id: string;
      payout_date: string;
      method: ContributionMethod;
      amount: number;
      note?: string;
    }) => {
      const { error } = await supabase
        .from('committee_payouts' as any)
        .upsert(
          {
            committee_id: input.committee_id,
            month_number: input.month_number,
            recipient_member_id: input.recipient_member_id,
            payout_date: input.payout_date,
            method: input.method,
            amount: input.amount,
            note: input.note ?? null,
            recorded_by: user?.id ?? null,
          },
          { onConflict: 'committee_id,month_number' }
        );
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['committee-payouts', vars.committee_id] });
    },
  });
}

export function useDeleteCommittee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (committeeId: string) => {
      const { error } = await supabase.from('committees' as any).delete().eq('id', committeeId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['committees'] });
    },
  });
}
