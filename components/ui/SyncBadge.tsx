'use client';

import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { Cloud, CloudOff } from 'lucide-react';

export function SyncBadge() {
  const { isOnline } = useOnlineStatus();
  const { pendingCount, isSyncing } = useOfflineSync();

  if (pendingCount === 0 || !isOnline) return null;

  return (
    <div className="fixed bottom-20 lg:bottom-4 right-4 z-50 flex items-center gap-2 bg-blue-500/15 border border-blue-500/25 rounded-lg px-3 py-2">
      {isSyncing ? (
        <>
          <Cloud className="w-4 h-4 text-blue-500 animate-pulse" />
          <span className="text-xs font-semibold text-blue-600">
            Syncing {pendingCount} expense{pendingCount === 1 ? '' : 's'}...
          </span>
        </>
      ) : (
        <>
          <Cloud className="w-4 h-4 text-blue-500" />
          <span className="text-xs font-semibold text-blue-600">
            {pendingCount} pending sync
          </span>
        </>
      )}
    </div>
  );
}
