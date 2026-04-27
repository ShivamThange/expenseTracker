import { get, set, del } from 'idb-keyval';

const QUEUE_KEY = 'offline-expense-queue';

export interface QueuedExpense {
  id: string;
  payload: any;
  createdAt: number;
}

export async function enqueueExpense(payload: any): Promise<string> {
  const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const queue = (await get(QUEUE_KEY)) || [];
  queue.push({
    id: tempId,
    payload,
    createdAt: Date.now(),
  });
  await set(QUEUE_KEY, queue);
  return tempId;
}

export async function getQueue(): Promise<QueuedExpense[]> {
  return (await get(QUEUE_KEY)) || [];
}

export async function removeFromQueue(id: string): Promise<void> {
  const queue = (await get(QUEUE_KEY)) || [];
  const updated = queue.filter((item: QueuedExpense) => item.id !== id);
  if (updated.length === 0) {
    await del(QUEUE_KEY);
  } else {
    await set(QUEUE_KEY, updated);
  }
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
