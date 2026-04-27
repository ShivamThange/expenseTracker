'use client';

import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { Wifi, WifiOff } from 'lucide-react';

export function OfflineBanner() {
  const { isOnline } = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-yellow-500/10 border-b border-yellow-500/25 px-4 py-2.5 flex items-center gap-3">
      <WifiOff className="w-4 h-4 text-yellow-500 shrink-0" />
      <span className="text-xs font-semibold text-yellow-600 flex-1">
        You're offline — new expenses will sync when connected
      </span>
    </div>
  );
}
