export type PayoutMethod = 'rotation' | 'draw';
export type ContributionMethod = 'online' | 'cash';
export type CommitteeStatus = 'active' | 'completed';

export interface Committee {
  id: string;
  name: string;
  monthly_amount: number;
  total_months: number;
  start_month: string; // YYYY-MM-DD (first day of start month)
  payout_method: PayoutMethod;
  organizer_id: string;
  organizer_name: string;
  status: CommitteeStatus;
  note?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CommitteeMember {
  id: string;
  committee_id: string;
  name: string;
  phone?: string | null;
  user_id?: string | null;
  rotation_order?: number | null;
  created_at: string;
}

export interface CommitteeContribution {
  id: string;
  committee_id: string;
  member_id: string;
  month_number: number;
  paid: boolean;
  paid_on?: string | null;
  method?: ContributionMethod | null;
  note?: string | null;
  marked_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CommitteePayout {
  id: string;
  committee_id: string;
  month_number: number;
  recipient_member_id: string;
  payout_date: string;
  method: ContributionMethod;
  amount: number;
  note?: string | null;
  recorded_by?: string | null;
  created_at: string;
  updated_at: string;
}
