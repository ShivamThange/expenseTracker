'use client';

import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { flushQueue, getQueue, QueuedExpense } from '@/lib/offline/queue';

export function useOfflineSync() {
  const queryClient = useQueryClient();
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  const syncQueue = async () => {
    const queue = await getQueue();
    if (queue.length === 0) {
      setPendingCount(0);
      return;
    }

    setIsSyncing(true);
    try {
      const { synced, failed } = await flushQueue(async (item: QueuedExpense) => {
        const response = await fetch('/api/expenses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item.payload),
        });

        if (!response.ok) {
          throw new Error(`Failed to sync: ${response.statusText}`);
        }

        const data = await response.json();
        if (data.error) throw new Error(data.error);

        const { groupId } = item.payload;
        queryClient.invalidateQueries({ queryKey: ['expenses', groupId] });
        queryClient.invalidateQueries({ queryKey: ['expenses', 'all'] });

        return data;
      });

      if (synced > 0) {
        toast.success(`Synced ${synced} expense${synced === 1 ? '' : 's'}`);
      }
      if (failed > 0) {
        toast.error(`${failed} expense${failed === 1 ? '' : 's'} failed to sync — will retry later`);
      }

      const remaining = await getQueue();
      setPendingCount(remaining.length);
    } catch (err) {
      console.error('Sync error:', err);
      toast.error('Failed to sync expenses');
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    const updatePendingCount = async () => {
      const queue = await getQueue();
      setPendingCount(queue.length);
    };

    updatePendingCount();
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      syncQueue();
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [queryClient]);

  return { pendingCount, isSyncing };
}
