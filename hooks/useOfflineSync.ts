'use client';

import { useCallback, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { flushQueue, getQueue, QueuedExpense, QUEUE_UPDATED_EVENT } from '@/lib/offline/queue';

export function useOfflineSync() {
  const queryClient = useQueryClient();
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  const refreshPendingCount = useCallback(async () => {
    const queue = await getQueue();
    setPendingCount(queue.length);
  }, []);

  const syncQueue = useCallback(async () => {
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

        if (!response.ok) throw new Error(`Sync failed: ${response.statusText}`);

        const data = await response.json();
        if (data.error) throw new Error(data.error);

        const groupId = item.payload.groupId;
        if (groupId) {
          queryClient.invalidateQueries({ queryKey: ['expenses', groupId] });
        }
        queryClient.invalidateQueries({ queryKey: ['expenses', 'all'] });
        queryClient.invalidateQueries({ queryKey: ['groups'] });
      });

      if (synced > 0) toast.success(`Synced ${synced} expense${synced === 1 ? '' : 's'}`);
      if (failed > 0) toast.error(`${failed} expense${failed === 1 ? '' : 's'} failed to sync — will retry`);
    } catch (err) {
      console.error('Sync error:', err);
    } finally {
      setIsSyncing(false);
      refreshPendingCount();
    }
  }, [queryClient, refreshPendingCount]);

  // Refresh count on mount and when queue changes
  useEffect(() => {
    refreshPendingCount();
    window.addEventListener(QUEUE_UPDATED_EVENT, refreshPendingCount);
    return () => window.removeEventListener(QUEUE_UPDATED_EVENT, refreshPendingCount);
  }, [refreshPendingCount]);

  // Sync on reconnect and on mount if already online
  useEffect(() => {
    const handleOnline = () => syncQueue();
    window.addEventListener('online', handleOnline);

    // Also attempt sync on mount in case app loaded while online with queued items
    if (navigator.onLine) syncQueue();

    return () => window.removeEventListener('online', handleOnline);
  }, [syncQueue]);

  return { pendingCount, isSyncing, syncQueue };
}
