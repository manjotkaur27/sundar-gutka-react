// Fire-and-forget write queue for analytics DB operations.
// Callers push a () => Promise and return instantly — no await needed at the call site.
// Tasks run sequentially so concurrent upserts on the same date row never race.
let _chain = Promise.resolve();

export const enqueueAnalyticsWrite = (fn) => {
  _chain = _chain.then(() => fn().catch(() => {}));
};
