import { useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export function useBackup() {
  const { session } = useAuth();
  const [isBacking, setIsBacking] = useState(false);

  const backup = useCallback(async () => {
    if (!session) {
      toast.error('Please sign in to backup');
      return;
    }
    setIsBacking(true);
    try {
      const expenses = JSON.parse(localStorage.getItem('sk_expenses') || '[]');
      const lending = JSON.parse(localStorage.getItem('sk_lending') || '[]');

      const { data, error } = await supabase.functions.invoke('data-backup', {
        body: { action: 'backup', data: { expenses, lending } },
      });

      if (error) throw error;
      toast.success('Backup saved! ☁️');
    } catch (e: any) {
      toast.error('Backup failed: ' + (e.message || 'Unknown error'));
    } finally {
      setIsBacking(false);
    }
  }, [session]);

  const restore = useCallback(async () => {
    if (!session) {
      toast.error('Please sign in to restore');
      return;
    }
    setIsBacking(true);
    try {
      const { data, error } = await supabase.functions.invoke('data-backup', {
        body: { action: 'restore' },
      });

      if (error) throw error;
      if (data?.data) {
        if (data.data.expenses) localStorage.setItem('sk_expenses', JSON.stringify(data.data.expenses));
        if (data.data.lending) localStorage.setItem('sk_lending', JSON.stringify(data.data.lending));
        toast.success('Data restored! Refresh to see changes 🔄');
      }
    } catch (e: any) {
      toast.error(e.message || 'Restore failed');
    } finally {
      setIsBacking(false);
    }
  }, [session]);

  return { backup, restore, isBacking };
}
