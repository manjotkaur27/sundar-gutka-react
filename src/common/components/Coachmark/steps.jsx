import React from "react";
import TourTooltip from "./TourTooltip";

// Builds a library `steps` array from simple {titleKey, bodyKey} defs. Each
// step renders the themed TourTooltip and uses a rounded-rectangle spotlight
// padded around the highlighted control.
const buildSteps = (defs) =>
  defs.map(({ titleKey, bodyKey }) => ({
    shape: { type: "rectangle", padding: 10 },
    render: (props) => (
      <TourTooltip titleKey={titleKey} bodyKey={bodyKey} total={defs.length} {...props} />
    ),
  }));

// One step: the Bani list on Home.
export const HOME_STEPS = buildSteps([
  { titleKey: "TOUR_HOME_TITLE", bodyKey: "TOUR_HOME_BODY" },
]);

// Two steps on the artist-preview screen (AudioTrackDialog): choose an artist,
// then press Next. AttachStep indices there must match this order (0,1).
export const PREVIEW_STEPS = buildSteps([
  { titleKey: "TOUR_READER_TRACKS_TITLE", bodyKey: "TOUR_READER_TRACKS_BODY" },
  { titleKey: "TOUR_PREVIEW_NEXT_TITLE", bodyKey: "TOUR_PREVIEW_NEXT_BODY" },
]);

// Full player (AudioControlBar): play/pause (0), download (1). AttachStep
// indices there must match this order. The optional "manage your downloads"
// walk-through is handled by touch-through callouts (GuideCallout), not a
// library step, so the user can tap the real Settings / Manage Downloads
// controls — a spotlight Modal would block those taps.
export const PLAYER_STEPS = buildSteps([
  { titleKey: "TOUR_READER_PLAY_TITLE", bodyKey: "TOUR_READER_PLAY_BODY" },
  { titleKey: "TOUR_READER_DOWNLOAD_TITLE", bodyKey: "TOUR_READER_DOWNLOAD_BODY" },
]);

// One step: the offline downloads list (shown ON the ManageDownloads screen).
export const DOWNLOADS_STEPS = buildSteps([
  { titleKey: "TOUR_MANAGE_DOWNLOADS_TITLE", bodyKey: "TOUR_MANAGE_DOWNLOADS_BODY" },
]);

// One step: the "Manage Downloads" ROW in Settings. Distinct copy from
// DOWNLOADS_STEPS — this points at the row and tells the user to TAP it to open
// the screen, instead of describing the downloads list (which would otherwise
// look like the ManageDownloads guide is showing inside Settings before the
// user has opened it).
export const SETTINGS_MANAGE_STEPS = buildSteps([
  { titleKey: "TOUR_SETTINGS_MANAGE_TITLE", bodyKey: "TOUR_SETTINGS_MANAGE_BODY" },
]);
