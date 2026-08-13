import React from "react";
import { Pressable, useWindowDimensions, View } from "react-native";
import PropTypes from "prop-types";
// The commonjs build: the package's default entry is ESM, which jest cannot
// transform and Metro would have to be told about.
import { canAppend } from "../../gurmukhiInput";
import { KEY_ROWS } from "../../gurmukhiKeys";
import useTokens from "../../hooks/useTokens";
import Text from "./Text";

// An on-screen Punjabi keyboard.
//
// ── The layout is not ours ────────────────────────────────────────────────
// It comes from `simple-keyboard-layouts` (MIT), the layout set behind
// react-simple-keyboard: the standard InScript Punjabi arrangement, the same
// one Android and iOS ship, so anyone who already types Punjabi recognises the
// key positions. Only the RENDERER is ours — that package draws to the DOM.
//
// ── Why it is full-bleed ──────────────────────────────────────────────────
// InScript is a DESKTOP layout: twelve keys on the widest row. Inside the
// sheet's 16pt padding, with a border and 4pt padding on every key, each key
// came out around 25pt wide — thin, hard to hit, and overflowing the row. A
// real phone keyboard solves this the only way it can: span the full width,
// drop the per-key borders, use hairline gaps. So this cancels the sheet's
// padding with a negative margin and does the same.
//
// At 390pt that gives (390 - 8 edge - 33 gaps) / 12 ≈ 29pt wide by 44pt tall —
// a real tap target, in the proportions phone keyboards actually use.
//
// ── The rules are enforced ────────────────────────────────────────────────
// `canAppend` (see common/gurmukhiInput) decides whether a key may follow what
// is already typed — it is what stops "ਅਨੀਾਾਿਿੀੁੁ". A key that cannot is
// DISABLED and dimmed rather than hidden, so the layout never reshuffles under
// the user's finger.

const BKSP = "{bksp}";
const SPACE = "{space}";
const LABELS = { [BKSP]: "⌫", [SPACE]: "␣" };

/** The alphabet, plus the two controls a name field needs. */
const ROWS = [...KEY_ROWS, [SPACE, BKSP]];
/** Gaps and edge inset, in points. Deliberately tight — see the note above. */
const GAP = 3;
const EDGE = 4;

// ── Why the keys do NOT grow with the text-size setting ────────────────────
// A key's height came from `layout.touchTarget`, which scales at the full font
// rate: 44pt becomes 66pt at the 1.5x cap. Across seven rows that is 460pt of
// keys before gaps, and the keyboard is a PINNED sheet footer — it takes its
// height before the body gets any. So the sheet showed its title and a sliver
// of the name field, with the field itself and both buttons clipped away
// entirely, on the one screen whose whole job is typing a name.
//
// Raising the text size must make the GLYPHS bigger, not push the field being
// typed into off the screen. Both platforms' own keyboards work this way: key
// height is a share of the display and holds steady as text size changes.
//
/** The most of the window the keys may take, gaps and plate included. */
const MAX_WINDOW_SHARE = 0.55;
/**
 * The floor, for a short screen. Below `layout.touchTarget` on purpose: these
 * keys are already only ~29pt WIDE (twelve to a row is what InScript needs),
 * so height was never the binding constraint on the target. 34x29 clears the
 * 24x24 minimum in WCAG 2.5.8.
 */
const MIN_KEY_HEIGHT = 34;

const GurmukhiKeyboard = ({ value, onKey, onBackspace }) => {
  const { c, radii, layout, theme } = useTokens();
  const { height } = useWindowDimensions();

  // UNSCALED tokens throughout the plate, deliberately. `layout.touchTarget`
  // and `space.*` from useTokens are already multiplied by the OS text scale,
  // and scaling is the very thing being avoided: were the padding to grow with
  // the text size it would eat the budget below and the keys would shrink to
  // pay for it, which is font-scale dependence by another route.
  const pad = theme.space.md;
  const clearance = theme.space.lg;
  const baseKeyHeight = theme.layout.touchTarget;
  // Everything in the plate that is not a key: its own padding, the gaps
  // between rows, and the margin clearing whatever sits above it.
  const plateChrome = pad * 2 + clearance + GAP * (ROWS.length - 1);
  const keyHeight = Math.max(
    MIN_KEY_HEIGHT,
    Math.min(baseKeyHeight, Math.floor((height * MAX_WINDOW_SHARE - plateChrome) / ROWS.length))
  );

  const press = (key) => {
    if (key === BKSP) {
      onBackspace();
      return;
    }
    onKey(key === SPACE ? " " : key);
  };

  // A multi-codepoint key (base + nukta) is checked one codepoint at a time,
  // against the text as it grows — otherwise the nukta half would be judged
  // against the wrong preceding character.
  const allowed = (key) => {
    if (key === BKSP) return true;
    const chars = key === SPACE ? [" "] : [...key];
    let text = value;
    return chars.every((ch) => {
      if (!canAppend(text, ch)) return false;
      text += ch;
      return true;
    });
  };

  return (
    <View
      style={{
        // Cancels the sheet's own horizontal padding so the keys get the full
        // width. Without this there is not room for twelve of them.
        marginHorizontal: -layout.sheet.paddingHorizontal,
        // Clears whatever sits above it. Pinned as a sheet footer it is flush
        // against the last control otherwise, so the Done button and the top
        // row of keys read as one block.
        marginTop: clearance,
        paddingHorizontal: EDGE,
        paddingVertical: pad,
        gap: GAP,
        // A keyboard is a RECESSED plate with RAISED keys on it — the plate has
        // to sit behind both the sheet and the keys. `fillSubtle` was used here
        // and gets that backwards in dark mode: it resolves LIGHTER than
        // `surface`, so the plate glowed and the keys sank into it. Reading the
        // ground role instead keeps plate < key < pressed in every theme, the
        // same ordering the Reader's audio panels use.
        backgroundColor: c.backgroundAlt,
        borderTopWidth: layout.borderWidth.hairline,
        borderTopColor: c.border,
      }}
    >
      {ROWS.map((row, rowIndex) => (
        // eslint-disable-next-line react/no-array-index-key
        <View key={`row-${rowIndex}`} style={{ flexDirection: "row", gap: GAP }}>
          {row.map((key, keyIndex) => {
            const on = allowed(key);
            return (
              <Pressable
                // eslint-disable-next-line react/no-array-index-key
                key={`${key}-${keyIndex}`}
                onPress={() => press(key)}
                disabled={!on}
                accessibilityRole="button"
                accessibilityState={{ disabled: !on }}
                accessibilityLabel={LABELS[key] ?? key}
                style={({ pressed }) => ({
                  // Space takes the width of several keys, as on any keyboard.
                  flex: key === SPACE ? 6 : 1,
                  alignItems: "center",
                  justifyContent: "center",
                  // Tall enough to hit; the WIDTH is what the row divides up.
                  // A height, not a minimum: a minimum would let the glyph grow
                  // the key back with the text size, which is what this exists
                  // to stop. The glyph itself still scales and wraps to one
                  // line inside it.
                  height: keyHeight,
                  // No horizontal padding: at twelve keys to a row it is width
                  // this cannot spare. The hairline IS affordable and earns its
                  // place — it keeps the keys legible in a theme whose `surface`
                  // and `backgroundAlt` sit close together.
                  paddingHorizontal: 0,
                  borderRadius: radii.sm,
                  borderWidth: layout.borderWidth.hairline,
                  borderColor: c.border,
                  backgroundColor: pressed ? c.surfaceSelected : c.surface,
                  opacity: on ? 1 : 0.3,
                })}
              >
                <Text variant="body" align="center" color="textPrimary" numberOfLines={1}>
                  {LABELS[key] ?? key}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
};

GurmukhiKeyboard.propTypes = {
  /** What is already typed — the rules are relative to it. */
  value: PropTypes.string.isRequired,
  /** Called with the character to insert. */
  onKey: PropTypes.func.isRequired,
  onBackspace: PropTypes.func.isRequired,
};

export default GurmukhiKeyboard;
