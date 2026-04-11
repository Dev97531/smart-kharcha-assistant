import React, { createContext, useContext, useMemo } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import type { Expense, LendingRecord } from '@/types/finance';
import {
  startOfDay, startOfMonth, endOfMonth, isWithinInterval, parseISO,
} from 'date-fns';

interface FinanceContextType {
  expenses: Expense[];
  lending: LendingRecord[];
  addExpense: (e: Omit<Expense, 'id' | 'createdAt'>) => void;
  deleteExpense: (id: string) => void;
  addLending: (l: Omit<LendingRecord, 'id' | 'createdAt'>) => void;
  settleLending: (id: string) => void;
  deleteLending: (id: string) => void;
  todayTotal: number;
  monthTotal: number;
  toReceive: number;
  toPay: number;
  todayByCategory: Record<string, number>;
  monthByCategory: Record<string, number>;
}

const FinanceContext = createContext<FinanceContextType | null>(null);

export function FinanceProvider({ children }: { children: React.ReactNode }) {
  const [expenses, setExpenses] = useLocalStorage<Expense[]>('sk_expenses', []);
  const [lending, setLending] = useLocalStorage<LendingRecord[]>('sk_lending', []);

  const addExpense = (e: Omit<Expense, 'id' | 'createdAt'>) => {
    const newExpense: Expense = {
      ...e,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    setExpenses(prev => [newExpense, ...prev]);
  };

  const deleteExpense = (id: string) => {
    setExpenses(prev => prev.filter(e => e.id !== id));
  };

  const addLending = (l: Omit<LendingRecord, 'id' | 'createdAt'>) => {
    const newRecord: LendingRecord = {
      ...l,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    setLending(prev => [newRecord, ...prev]);
  };

  const settleLending = (id: string) => {
    setLending(prev => prev.map(l => l.id === id ? { ...l, settled: true, remainingAmount: 0 } : l));
  };

  const deleteLending = (id: string) => {
    setLending(prev => prev.filter(l => l.id !== id));
  };

  const now = new Date();
  const todayStart = startOfDay(now);
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const todayExpenses = useMemo(
    () => expenses.filter(e => parseISO(e.date) >= todayStart),
    [expenses, todayStart.toISOString()]
  );

  const monthExpenses = useMemo(
    () => expenses.filter(e => isWithinInterval(parseISO(e.date), { start: monthStart, end: monthEnd })),
    [expenses, monthStart.toISOString()]
  );

  const todayTotal = todayExpenses.reduce((s, e) => s + e.amount, 0);
  const monthTotal = monthExpenses.reduce((s, e) => s + e.amount, 0);

  const toReceive = lending
    .filter(l => l.type === 'lent' && !l.settled)
    .reduce((s, l) => s + l.remainingAmount, 0);

  const toPay = lending
    .filter(l => l.type === 'borrowed' && !l.settled)
    .reduce((s, l) => s + l.remainingAmount, 0);

  const groupByCategory = (list: Expense[]) =>
    list.reduce<Record<string, number>>((acc, e) => {
      acc[e.category] = (acc[e.category] || 0) + e.amount;
      return acc;
    }, {});

  const todayByCategory = useMemo(() => groupByCategory(todayExpenses), [todayExpenses]);
  const monthByCategory = useMemo(() => groupByCategory(monthExpenses), [monthExpenses]);

  return (
    <FinanceContext.Provider
      value={{
        expenses, lending, addExpense, deleteExpense,
        addLending, settleLending, deleteLending,
        todayTotal, monthTotal, toReceive, toPay,
        todayByCategory, monthByCategory,
      }}
    >
      {children}
    </FinanceContext.Provider>
  );
}

export function useFinance() {
  const ctx = useContext(FinanceContext);
  if (!ctx) throw new Error('useFinance must be used within FinanceProvider');
  return ctx;
}
