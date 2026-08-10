import React from "react";
import { Pressable, View } from "react-native";
import { useSelector } from "react-redux";
import PropTypes from "prop-types";
import constant from "@common/constant";
import useTokens from "@common/hooks/useTokens";
import { ChevronDownIcon, ChevronRight, FolderIcon, PinIcon, PlusIcon } from "@common/icons";
import { convertToUnicode, STRINGS } from "@common";
import { Text } from "../../common/components/ui";

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
// Cards with their own borders and radii made this screen read as a settings
// page dropped inside the bani list, which is what it looked like before.
//
// The whole row toggles the expansion and the chevron only mirrors it, rather
// than the chevron being the sole target — a 20pt glyph is a poor tap target
// and every platform's own list expands on the row.
//
// Sundar Gutka's bundled folders come through here too, with `system` set. They
// read identically but withhold pin and reorder, because they can be read and
// not edited.
const PothiRow = ({
  pothi,
  expanded,
  onToggle,
  onOpen,
  onTogglePin = null,
  onLongPress = null,
  onAddBanis = null,
  children = null,
  dragHandle = null,
}) => {
  const { c, space, layout } = useTokens();
  const fontFace = useSelector((state) => state.fontFace);
  // ONLY a bundled folder needs converting. Its name comes from the Banis
  // table as GurbaniAkhar ASCII with no Unicode column, which renders as
  // mojibake ("sv`Xy") under Baloo — the same fallback the bani list applies.
  //
  // A user pothi must never go through this. Its name is either typed by the
  // user or a localised string (the two default Nitnem pothis), and running a
  // Gurmukhi transliterator over real text mangles it.
  const needsConversion = pothi.system && !pothi.titleUni && fontFace === constant.BALOO_PAAJI;
  const title = pothi.titleUni || (needsConversion ? convertToUnicode(pothi.name) : pothi.name);

  return (
    <View>
      <Pressable
        onPress={onToggle}
        onLongPress={onLongPress ?? undefined}
        delayLongPress={400}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={`${title}, ${shabadCountLabel(pothi.count)}`}
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

        {/* The icon takes only size and colour, so the flip lives on a wrapper. */}
        <View style={{ transform: [{ rotate: expanded ? "180deg" : "0deg" }] }}>
          <ChevronDownIcon size={20} color={c.textSecondary} />
        </View>
      </Pressable>

      {expanded && (
        // No tinted ground: the contents belong to the same list, and the
        // indent plus the hairlines already show the nesting. A second colour
        // here made the panel read as a foreign block dropped into the list.
        <View>
          {pothi.count === 0 ? (
            <Text
              variant="body"
              color="textSecondary"
              style={{
                paddingLeft: layout.screenGutter + space.xl,
                paddingRight: layout.screenGutter,
                paddingVertical: space.lg,
              }}
            >
              {STRINGS.POTHI_EMPTY_CONTENTS}
            </Text>
          ) : (
            children
          )}

          {onAddBanis && (
            <Pressable
              onPress={onAddBanis}
              accessibilityRole="button"
              accessibilityLabel={STRINGS.POTHI_ADD_BANIS}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                gap: space.md,
                minHeight: layout.row.minHeight,
                paddingLeft: layout.screenGutter + space.xl,
                paddingRight: layout.screenGutter,
                paddingVertical: space.lg,
                backgroundColor: pressed ? c.surfaceSelected : "transparent",
              })}
            >
              <PlusIcon size={18} color={c.accent} />
              <Text variant="body" color="accent">
                {STRINGS.POTHI_ADD_BANIS}
              </Text>
            </Pressable>
          )}

          <Pressable
            onPress={onOpen}
            disabled={pothi.count === 0}
            accessibilityRole="button"
            accessibilityLabel={STRINGS.POTHI_OPEN}
            style={({ pressed }) => ({
              flexDirection: "row",
              alignItems: "center",
              gap: space.md,
              minHeight: layout.row.minHeight,
              paddingLeft: layout.screenGutter + space.xl,
              paddingRight: layout.screenGutter,
              paddingVertical: space.lg,
              opacity: pothi.count === 0 ? 0.5 : 1,
              backgroundColor: pressed ? c.surfaceSelected : "transparent",
            })}
          >
            <Text variant="body" color="accent">
              {STRINGS.POTHI_OPEN}
            </Text>
            <ChevronRight size={18} color={c.accent} />
          </Pressable>
        </View>
      )}
    </View>
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
  expanded: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired,
  onOpen: PropTypes.func.isRequired,
  /** Omitted for bundled folders, which cannot be pinned. */
  onTogglePin: PropTypes.func,
  /** Opens rename/delete. Omitted for bundled folders, which allow neither. */
  onLongPress: PropTypes.func,
  /** Opens the bani picker. Omitted for bundled folders, whose contents are fixed. */
  onAddBanis: PropTypes.func,
  /** The resolved shabad rows, rendered when expanded. */
  children: PropTypes.node,
  /** The reorder grip, supplied by the draggable list for user pothis only. */
  dragHandle: PropTypes.node,
};

export default PothiRow;
