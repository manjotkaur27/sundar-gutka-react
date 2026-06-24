import React, { useCallback, useEffect, useRef, useState } from "react";
import { Dimensions, StatusBar, StyleSheet, View } from "react-native";

/**
 * Root-level host for the contextual coachmark (spotlight tour) overlay.
 *
 * react-native-spotlight-tour is patched to push its dim + spotlight JSX into
 * this host via a tiny global registry (instead of rendering its own <Modal>),
 * so the overlay lives in the app's own window — no separate Modal window that
 * loses the app's immersive bars or sits in a different coordinate space.
 *
 * A transparent absolute-fill "probe" measures where the host content lands in
 * the window; the overlay layer is then offset by the negative of that and sized
 * to the screen, so its origin maps to window (0,0) — the same basis AttachStep's
 * measureInWindow reports — keeping every spotlight pixel-accurate with no
 * per-device math.
 *
 * Mounted once, last, at the app root (see app.js) so it stacks above everything.
 */

// Minimal external store the patched library writes into. Keyed by a per-overlay
// id so multiple tour providers (Home/Preview/Player/Downloads) can coexist; only
// one is ever active at a time, so at most one entry is non-null.
const listeners = new Set();
const contents = new Map();
const emit = () => listeners.forEach((l) => l());

export const coachmarkPortal = {
  set(id, node) {
    if (node == null) contents.delete(id);
    else contents.set(id, node);
    emit();
  },
  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  snapshot() {
    return contents;
  },
};

// Expose globally so the patched library (in node_modules, which can't import app
// source via the @common alias) can reach the registry without a fragile path.
if (typeof globalThis !== "undefined") {
  globalThis.__coachmarkPortal = coachmarkPortal;
}

const CoachmarkHost = () => {
  const [, force] = useState(0);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const probeRef = useRef(null);

  useEffect(() => coachmarkPortal.subscribe(() => force((n) => n + 1)), []);

  // Measure where the host content naturally lands in the window, so the overlay
  // layer can be pulled back to window (0,0). Re-measured on every layout
  // (rotation / window resize) so it stays correct.
  const measureOffset = useCallback(() => {
    probeRef.current?.measureInWindow((x, y) => {
      if (typeof x === "number" && typeof y === "number") {
        setOffset((prev) => (prev.x === x && prev.y === y ? prev : { x, y }));
      }
    });
  }, []);

  const nodes = [];
  coachmarkPortal.snapshot().forEach((node, id) => {
    if (node) nodes.push(<React.Fragment key={id}>{node}</React.Fragment>);
  });

  const { width: screenW, height: screenH } = Dimensions.get("screen");

  const active = nodes.length > 0;

  return (
    <>
      {/* Always-mounted, touch-transparent probe used only to measure the host's
          window offset before a tour starts (so frame one is already aligned). */}
      <View
        ref={probeRef}
        onLayout={measureOffset}
        pointerEvents="none"
        style={StyleSheet.absoluteFill}
      />
      {active && (
        <>
          {/* Screens paint the status bar with a solid backgroundColor that the OS
              would otherwise draw over the dim as a bare strip; hide it for the
              tour's duration. Rendered last (this host mounts after Navigation) so
              it wins; reverts to the screen's status bar when the tour ends. */}
          <StatusBar hidden animated={false} translucent backgroundColor="transparent" />
          <View
            pointerEvents="box-none"
            style={{
              position: "absolute",
              top: -offset.y,
              left: -offset.x,
              width: screenW,
              height: screenH,
              // Android draws by elevation, not just tree order: the reader's
              // bottom nav has elevation and would otherwise paint above the dim.
              elevation: 9999,
              zIndex: 9999,
            }}
          >
            {nodes}
          </View>
        </>
      )}
    </>
  );
};

export default CoachmarkHost;
