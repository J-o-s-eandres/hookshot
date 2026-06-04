import type { RequestsRepo } from "../db/requests.repo.js";
import type { WebhooksRepo } from "../db/webhooks.repo.js";

const DEFAULT_INTERVAL_MS = 60 * 60 * 1000;

export interface CleanupHandle {
  stop: () => void;
}

export function startCleanup(
  requests: RequestsRepo,
  webhooks: WebhooksRepo,
  retentionDays: number,
  intervalMs: number = DEFAULT_INTERVAL_MS,
): CleanupHandle {
  const purge = async () => {
    try {
      const removed = await requests.purgeOlderThan(retentionDays);
      if (removed > 0) {
        console.log(`[cleanup] purgadas ${removed} peticiones antiguas`);
      }

      const expired = await webhooks.findExpired();
      if (expired.length > 0) {
        const ids = expired.map((w) => w.id);
        const deleted = await webhooks.deleteMany(ids);
        console.log(`[cleanup] purgados ${deleted} webhooks demo expirados`);
      }
    } catch (err) {
      console.error("[cleanup] error al purgar:", err);
    }
  };

  void purge();
  const timer = setInterval(() => void purge(), intervalMs);
  timer.unref?.();

  return { stop: () => clearInterval(timer) };
}
