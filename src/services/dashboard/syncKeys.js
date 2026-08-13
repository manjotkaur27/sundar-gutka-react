// AsyncStorage keys for dashboard sync state.
//
// Extracted here because three unrelated places need them and none should own
// the literals: useDashboardSync (writes them), dashboardSync (writes the
// restored-top-banis cache) and sso/accountScope (clears all three when the
// signed-in account changes). Keeping them in a plain module — no React, no
// navigation imports — means the purge path can be unit tested without pulling
// a hook's dependency tree in.

// "This device has had its one restore attempt." Gates BOTH the restore and the
// push (see useDashboardSync): a push before restore has settled would overwrite
// real cloud history with a fresh install's near-zero totals.
export const DASHBOARD_RESTORED_KEY = "@dashboard_restored_v1";

// Timestamp of the last successful push, used for the 60s cooldown and for the
// header's "last synced" readout.
export const DASHBOARD_LAST_PUSH_KEY = "@dashboard_last_push";

// Top read/listened banis captured at the last cloud restore, so the Explore
// tiles survive a reinstall (raw session history does not).
export const RESTORED_TOP_BANIS_KEY = "@restored_top_banis_v1";
