'use client';

import { SessionProvider } from 'next-auth/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { get, set, del } from 'idb-keyval';
import { Toaster } from '@/components/ui/sonner';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { SyncBadge } from '@/components/ui/SyncBadge';
import { OfflineSyncProvider } from '@/components/OfflineSyncProvider';
import { useState } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            gcTime: 1000 * 60 * 60 * 24,
            networkMode: 'offlineFirst',
            retry: 1,
          },
        },
      })
  );

  const [idbPersister] = useState(() =>
    createAsyncStoragePersister({
      storage: { getItem: get, setItem: set, removeItem: del },
      key: 'rq-cache',
    })
  );

  return (
    <SessionProvider>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{ persister: idbPersister, maxAge: 1000 * 60 * 60 * 24 }}
      >
        <OfflineSyncProvider>
          <OfflineBanner />
          <SyncBadge />
          {children}
          <Toaster richColors position="top-right" />
        </OfflineSyncProvider>
      </PersistQueryClientProvider>
    </SessionProvider>
  );
}
