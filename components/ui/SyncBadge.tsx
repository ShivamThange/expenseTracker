'use client';

import { useOfflineSync } from '@/hooks/useOfflineSync';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { Cloud, CloudOff } from 'lucide-react';

export function SyncBadge() {
  const { pendingCount, isSyncing } = useOfflineSync();
  const { isOnline } = useOnlineStatus();

  if (pendingCount === 0) return null;

  const offline = !isOnline;

  return (
    <div className={`fixed bottom-20 lg:bottom-4 right-4 z-50 flex items-center gap-2 rounded-lg px-3 py-2 border ${offline ? 'bg-yellow-500/10 border-yellow-500/25' : 'bg-blue-500/10 border-blue-500/25'}`}>
      {offline ? (
        <>
          <CloudOff className="w-4 h-4 text-yellow-500 shrink-0" />
          <span className="text-xs font-semibold text-yellow-600">
            {pendingCount} expense{pendingCount === 1 ? '' : 's'} pending sync
          </span>
        </>
      ) : isSyncing ? (
        <>
          <Cloud className="w-4 h-4 text-blue-500 animate-pulse shrink-0" />
          <span className="text-xs font-semibold text-blue-600">
            Syncing {pendingCount} expense{pendingCount === 1 ? '' : 's'}...
          </span>
        </>
      ) : (
        <>
          <Cloud className="w-4 h-4 text-blue-500 shrink-0" />
          <span className="text-xs font-semibold text-blue-600">
            {pendingCount} expense{pendingCount === 1 ? '' : 's'} queued
          </span>
        </>
      )}
    </div>
  );
}
