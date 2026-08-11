import React from "react";
import { Pressable, View } from "react-native";
import PropTypes from "prop-types";
import useTokens from "@common/hooks/useTokens";
import { ArrowRightIcon, FolderIcon, PinIcon } from "@common/icons";
import { STRINGS } from "@common";
import { Text } from "../../common/components/ui";
import usePothiTitle from "../hooks/usePothiTitle";

/** "1 shabad" / "{count} shabads" — the singular is its own string, not a suffix. */
export const shabadCountLabel = (count) =>
  count === 1
    ? STRINGS.POTHI_SHABAD_COUNT_ONE
    : STRINGS.formatString(STRINGS.POTHI_SHABAD_COUNT, { count });

// One pothi in the Folders tab.
//
// Styled as a LIST ROW, not a card — the same shape the bani list uses: flat on
// the page's own ground, an inset hairline between rows, a folder glyph, and
// room to breathe (`space.lg` vertically, `layout.row.minHeight` as a floor).
//
// The row NAVIGATES; it does not expand. An accordion put a second, differently
// styled list inside the first one, which is why the contents read as a foreign
// block wedged into the page. Its banis now open on their own screen, in the
// ordinary All Banis list, where a bani behaves exactly as it does anywhere
// else — see FolderScreen.
//
// Sundar Gutka's bundled folders come through here too, with `system` set. They
// read identically but withhold pin and reorder, because they can be read and
// not edited.
//
// The add-to-pothi picker renders this row as well, with its own trailing
// control and label — a pothi should look the same wherever it is listed, and
// the picker having its own row is what left it a different height with a
// different glyph and a different divider.
const PothiRow = ({
  pothi,
  onOpen,
  onTogglePin = null,
  onLongPress = null,
  dragHandle = null,
  trailing = undefined,
  actionLabel = null,
}) => {
  const { c, space, layout } = useTokens();
  const { titleFor } = usePothiTitle();
  const title = titleFor(pothi);
  const action = actionLabel ?? STRINGS.POTHI_OPEN;

  return (
    <Pressable
      onPress={onOpen}
      onLongPress={onLongPress ?? undefined}
      delayLongPress={400}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${shabadCountLabel(pothi.count)}, ${action}`}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: space.md,
        paddingHorizontal: layout.screenGutter,
        paddingVertical: space.lg,
        // A minimum, so a long Gurmukhi name or a raised font setting makes
        // the row taller rather than clipping it.
        minHeight: layout.row.minHeight,
        backgroundColor: pressed ? c.surfaceSelected : "transparent",
      })}
    >
      {dragHandle}
      <FolderIcon size={22} color={c.accent} />

      <View style={{ flex: 1, gap: space.xs }}>
        <Text variant="body" numberOfLines={2}>
          {title}
        </Text>
        <Text variant="caption" color="textSecondary">
          {shabadCountLabel(pothi.count)}
        </Text>
      </View>

      {onTogglePin && !pothi.system && (
        <Pressable
          onPress={onTogglePin}
          accessibilityRole="button"
          accessibilityState={{ selected: pothi.pinned }}
          accessibilityLabel={pothi.pinned ? STRINGS.POTHI_UNPIN : STRINGS.POTHI_PIN}
          hitSlop={layout.hitSlop}
          style={{
            minWidth: layout.touchTarget,
            minHeight: layout.touchTarget,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <PinIcon
            size={19}
            filled={pothi.pinned}
            color={pothi.pinned ? c.accent : c.textSecondary}
          />
        </Pressable>
      )}

      {/* Named, and a full arrow rather than a chevron: a chevron only says
          "there is more", where an arrow reads as "go", and this row's action
          is worth spelling out. Not its own Pressable — the whole row is the
          target, so the glyph never has to be hit. `numberOfLines` keeps a long
          translation on one line rather than letting it push the title out.
          A caller that does something OTHER than open passes its own trailing
          control; passing null gives a row with none. */}
      {trailing === undefined ? (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: space.xs,
            // "Open Pothi" is "Ouvrir le pothi" in French and longer still in
            // Spanish. Shrinking rather than holding its intrinsic width is what
            // stops the label pushing the pothi's own name out of the row; the
            // arrow never shrinks, so the affordance survives either way.
            flexShrink: 1,
          }}
        >
          <Text variant="caption" color="accent" numberOfLines={1} style={{ flexShrink: 1 }}>
            {STRINGS.POTHI_OPEN}
          </Text>
          <ArrowRightIcon size={18} color={c.accent} />
        </View>
      ) : (
        trailing
      )}
    </Pressable>
  );
};

PothiRow.propTypes = {
  pothi: PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string,
    titleUni: PropTypes.string,
    count: PropTypes.number.isRequired,
    system: PropTypes.bool,
    pinned: PropTypes.bool,
  }).isRequired,
  /** Opens the pothi's banis on their own screen. */
  onOpen: PropTypes.func.isRequired,
  /** Omitted for bundled folders, which cannot be pinned. */
  onTogglePin: PropTypes.func,
  /** Opens rename/delete/add. Omitted for bundled folders, which allow none. */
  onLongPress: PropTypes.func,
  /** The reorder grip, supplied by the draggable list for user pothis only. */
  dragHandle: PropTypes.node,
  /**
   * Replaces the "Open Pothi" affordance. Undefined keeps it; null renders no
   * trailing control at all.
   */
  trailing: PropTypes.node,
  /** What pressing the row does, for a screen reader. Defaults to "Open Pothi". */
  actionLabel: PropTypes.string,
};

export default PothiRow;
