import { get, set, del } from 'idb-keyval';

const QUEUE_KEY = 'offline-expense-queue';
export const QUEUE_UPDATED_EVENT = 'offline-queue-updated';

export interface QueuedExpense {
  id: string;
  payload: Record<string, any>;
  createdAt: number;
}

function dispatchQueueUpdate() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(QUEUE_UPDATED_EVENT));
  }
}

export async function enqueueExpense(payload: Record<string, any>): Promise<string> {
  const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const queue: QueuedExpense[] = (await get(QUEUE_KEY)) || [];
  queue.push({ id: tempId, payload, createdAt: Date.now() });
  await set(QUEUE_KEY, queue);
  dispatchQueueUpdate();
  return tempId;
}

export async function getQueue(): Promise<QueuedExpense[]> {
  return (await get(QUEUE_KEY)) || [];
}

export async function removeFromQueue(id: string): Promise<void> {
  const queue: QueuedExpense[] = (await get(QUEUE_KEY)) || [];
  const updated = queue.filter((item) => item.id !== id);
  if (updated.length === 0) {
    await del(QUEUE_KEY);
  } else {
    await set(QUEUE_KEY, updated);
  }
  dispatchQueueUpdate();
}

export async function flushQueue(
  onItem: (item: QueuedExpense) => Promise<void>
): Promise<{ synced: number; failed: number }> {
  const queue = await getQueue();
  let synced = 0;
  let failed = 0;

  for (const item of queue) {
    try {
      await onItem(item);
      await removeFromQueue(item.id);
      synced++;
    } catch (err) {
      console.error(`Failed to sync expense ${item.id}:`, err);
      failed++;
    }
  }

  return { synced, failed };
}
