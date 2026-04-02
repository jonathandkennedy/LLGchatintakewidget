/**
 * Offline queue for widget API calls.
 * Queues failed requests and replays them when connection is restored.
 */

type QueuedRequest = {
  id: string;
  url: string;
  method: string;
  body: string;
  timestamp: number;
};

const QUEUE_KEY = "intakellg_offline_queue";
const MAX_QUEUE = 20;

function getQueue(): QueuedRequest[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) ?? "[]");
  } catch { return []; }
}

function saveQueue(queue: QueuedRequest[]) {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue.slice(0, MAX_QUEUE)));
  } catch { /* ignore */ }
}

/**
 * Add a failed request to the offline queue.
 */
export function enqueueRequest(url: string, method: string, body: string): void {
  const queue = getQueue();
  queue.push({
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    url,
    method,
    body,
    timestamp: Date.now(),
  });
  saveQueue(queue);
}

/**
 * Replay all queued requests.
 * Returns the number of successfully replayed requests.
 */
export async function replayQueue(): Promise<number> {
  const queue = getQueue();
  if (queue.length === 0) return 0;

  let success = 0;
  const remaining: QueuedRequest[] = [];

  for (const req of queue) {
    // Skip requests older than 1 hour
    if (Date.now() - req.timestamp > 60 * 60 * 1000) continue;

    try {
      const response = await fetch(req.url, {
        method: req.method,
        headers: { "Content-Type": "application/json" },
        body: req.body,
      });
      if (response.ok) {
        success++;
      } else {
        remaining.push(req);
      }
    } catch {
      remaining.push(req);
    }
  }

  saveQueue(remaining);
  return success;
}

/**
 * Check if there are queued requests.
 */
export function hasQueuedRequests(): boolean {
  return getQueue().length > 0;
}

/**
 * Set up automatic replay when connection is restored.
 */
export function setupOfflineSync(): void {
  if (typeof window === "undefined") return;

  window.addEventListener("online", () => {
    replayQueue().then((count) => {
      if (count > 0) console.log(`[offline] Replayed ${count} queued requests`);
    });
  });
}

/**
 * Check if the browser is currently offline.
 */
export function isOffline(): boolean {
  return typeof navigator !== "undefined" && !navigator.onLine;
}
