// Shared-iPad hand-off (10/22). Work and progress live only in page memory. When a different
// student takes over the iPad (or a student ends the session), the page starts fresh — but
// only after the previous student's completion marks have reached the cloud.

// True when the work in memory belongs to someone else than the student who is logging in.
export function shouldStartFresh(ownerKey, nextKey) {
  return Boolean(ownerKey) && Boolean(nextKey) && ownerKey !== nextKey;
}

// Keeps track of checkpoint writes that are still on their way to the cloud.
export function createCheckpointTracker() {
  const pending = new Set();
  return {
    track(promise) {
      const tracked = Promise.resolve(promise).finally(() => pending.delete(tracked));
      pending.add(tracked);
      return tracked;
    },
    get size() { return pending.size; },
    // Wait for every write to finish (success or failure), at most timeoutMs.
    async flush(timeoutMs = 8000) {
      if (!pending.size) return { finished: true };
      let timer;
      const timedOut = new Promise((resolve) => { timer = setTimeout(() => resolve({ finished: false }), timeoutMs); });
      const result = await Promise.race([Promise.allSettled([...pending]).then(() => ({ finished: true })), timedOut]);
      clearTimeout(timer);
      return result;
    }
  };
}
