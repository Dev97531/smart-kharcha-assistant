export type SourceType = 'voice' | 'text' | 'image';

export type Category =
  | 'Food'
  | 'Travel'
  | 'Shopping'
  | 'Groceries'
  | 'Entertainment'
  | 'Bills'
  | 'Health'
  | 'Education'
  | 'Rent'
  | 'Other';

export interface Expense {
  id: string;
  amount: number;
  category: Category;
  subcategory?: string;
  merchant?: string;
  place?: string;
  date: string; // ISO string
  spokenDatePhrase?: string;
  note?: string;
  sourceType: SourceType;
  confidence?: number;
  lineItems?: LineItem[];
  tax?: number;
  createdAt: string;
}

export interface LineItem {
  name: string;
  amount: number;
  quantity?: number;
}

export interface LendingRecord {
  id: string;
  type: 'lent' | 'borrowed';
  person: string;
  amount: number;
  remainingAmount: number;
  date: string;
  dueDate?: string;
  note?: string;
  settled: boolean;
  createdAt: string;
}

export interface Budget {
  id: string;
  category: Category;
  monthlyLimit: number;
  month: string; // YYYY-MM
}

export const CATEGORIES: Category[] = [
  'Food', 'Travel', 'Shopping', 'Groceries', 'Entertainment',
  'Bills', 'Health', 'Education', 'Rent', 'Other',
];

export const CATEGORY_ICONS: Record<Category, string> = {
  Food: '🍔',
  Travel: '✈️',
  Shopping: '🛍️',
  Groceries: '🛒',
  Entertainment: '🎬',
  Bills: '📄',
  Health: '💊',
  Education: '📚',
  Rent: '🏠',
  Other: '📦',
};

export const CATEGORY_COLORS: Record<Category, string> = {
  Food: 'hsl(38, 92%, 50%)',
  Travel: 'hsl(210, 80%, 55%)',
  Shopping: 'hsl(280, 60%, 55%)',
  Groceries: 'hsl(152, 60%, 42%)',
  Entertainment: 'hsl(330, 70%, 55%)',
  Bills: 'hsl(200, 60%, 45%)',
  Health: 'hsl(0, 72%, 51%)',
  Education: 'hsl(174, 62%, 42%)',
  Rent: 'hsl(30, 50%, 45%)',
  Other: 'hsl(220, 15%, 50%)',
};
