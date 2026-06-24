// Stable keys for each contextual coachmark sequence. Each is gated
// independently (see useCoachmark) so a user sees each one once, the first
// time they reach that screen/control, in any order.
export const COACH = {
  HOME: "home",
  AUDIO_HINT: "audioHint",
  PREVIEW: "preview",
  PLAYER: "player",
  EXPLORE: "explore",
  // Spotlight on the Manage Downloads ROW inside Settings (reached via "Show me").
  MANAGE_SETTINGS: "manageSettings",
  DOWNLOADS: "downloads",
};
