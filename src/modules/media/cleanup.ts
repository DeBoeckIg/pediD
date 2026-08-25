import { nextCleanupAttempt } from './service';
export const MAX_CLEANUP_ATTEMPTS = 5;
export type CleanupJob = { id: string; objectPath: string; attempts: number; nextAttemptAt: string; completedAt: string | null; failedAt?: string | null; failureReason?: string | null };
export type StorageRemover = { remove(path: string): Promise<void> };
export type CleanupQueue = { claim(now: Date): Promise<CleanupJob | null>; persist(id: string, update: Partial<CleanupJob>): Promise<void> };
export function supabaseCleanupQueue(client: any): CleanupQueue {
  return {
    async claim(now) {
      const { data, error } = await client.rpc('claim_storage_cleanup_job', { claim_time: now.toISOString() });
      if (error) throw error;
      return data?.[0] ?? null;
    },
    async persist(id, update) {
      const { error } = await client.from('storage_cleanup_jobs').update(update).eq('id', id);
      if (error) throw error;
    },
  };
}
export function supabaseStorageRemover(client: any): StorageRemover {
  return { async remove(path) { const { error } = await client.storage.from('product-images').remove([path]); if (error) throw error; } };
}
export type CleanupAlert = (event: { jobId: string; objectPath: string; attempts: number; reason: string }) => void | Promise<void>;
export async function processCleanupJob(job: CleanupJob, storage: StorageRemover, persist: (update: Partial<CleanupJob>) => Promise<void>, alert: CleanupAlert = event => console.error('storage_cleanup_terminal_failure', event)) {
  try { await storage.remove(job.objectPath); await persist({ completedAt: new Date().toISOString() }); }
  catch (error) {
    // The claim RPC owns attempt accounting. The worker only persists the
    // outcome of the attempt it was handed, preventing a double increment.
    const attempts = job.attempts;
    if (attempts < 1 || attempts > MAX_CLEANUP_ATTEMPTS) throw new Error('Invalid cleanup attempt count');
    const reason = error instanceof Error ? error.message : 'Storage removal failed';
    if (attempts === MAX_CLEANUP_ATTEMPTS) {
      const failedAt = new Date().toISOString();
      await persist({ attempts, failedAt, failureReason: reason });
      await alert({ jobId: job.id, objectPath: job.objectPath, attempts, reason });
      return;
    }
    await persist({ nextAttemptAt: nextCleanupAttempt(attempts).toISOString() });
  }
}
export async function runCleanupWorker(queue: CleanupQueue, storage: StorageRemover, now = new Date()) { const job = await queue.claim(now); if (!job) return false; await processCleanupJob(job, storage, update => queue.persist(job.id, update)); return true; }
