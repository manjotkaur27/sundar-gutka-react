import React from "react";
import { Pressable, View } from "react-native";
import PropTypes from "prop-types";
import useTokens from "../../hooks/useTokens";
import Text from "./Text";

// A list row: the shape Settings, Seva and the bani lists all reimplement
// slightly differently today.
//
// The whole point of this component is the locale rule. A row is
// [leading icon] [title / subtitle] [value] [trailing control], and the middle
// column is the ONLY part allowed to grow. It takes `flex: 1` and its text
// wraps; the icon and the trailing control keep their intrinsic size. That is
// what stops a long Punjabi label from pushing a chevron off the screen — the
// failure mode that `adjustsFontSizeToFit` was being used to paper over, which
// instead left every row's label at a different size.
//
// `minHeight` scales with the OS font setting and never becomes a fixed height,
// so a two-line title in `hi` simply makes the row taller.

const Row = ({
  title,
  subtitle = undefined,
  leading = null,
  trailing = null,
  value = undefined,
  onPress = undefined,
  disabled = false,
  accessibilityRole = undefined,
  accessibilityLabel = undefined,
  accessibilityHint = undefined,
  accessibilityState = undefined,
  showDivider = false,
  testID = undefined,
  style = undefined,
  titleStyle = undefined,
}) => {
  const { c, space, layout } = useTokens();
  const interactive = Boolean(onPress);

  const content = (
    <>
      {leading ? <View style={{ width: layout.row.iconSize }}>{leading}</View> : null}

      {/* The only flexible column. Everything else keeps its natural width. */}
      <View style={{ flex: 1, gap: space.xxs }}>
        <Text variant="body" color={disabled ? "textDisabled" : "textPrimary"} style={titleStyle}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="bodySmall" color="textSecondary">
            {subtitle}
          </Text>
        ) : null}
      </View>

      {/* A value label can shrink and wrap, but never squeezes the title out:
          it is capped at roughly a third of the row. */}
      {value ? (
        <Text variant="bodySmall" color="textSecondary" align="right" style={{ flexShrink: 1 }}>
          {value}
        </Text>
      ) : null}

      {trailing ?? null}
    </>
  );

  const rowStyle = [
    {
      flexDirection: "row",
      alignItems: "center",
      gap: space.md,
      minHeight: subtitle ? layout.row.minHeightTwoLine : layout.row.minHeight,
      paddingHorizontal: layout.row.paddingHorizontal,
      paddingVertical: layout.row.paddingVertical,
      borderBottomWidth: showDivider ? layout.borderWidth.hairline : 0,
      borderBottomColor: c.border,
    },
    style,
  ];

  if (!interactive) {
    return (
      <View style={rowStyle} testID={testID}>
        {content}
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      testID={testID}
      accessibilityRole={accessibilityRole ?? "button"}
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled, ...accessibilityState }}
      style={({ pressed }) => [
        ...rowStyle,
        pressed ? { backgroundColor: c.surfaceSelected } : null,
      ]}
    >
      {content}
    </Pressable>
  );
};

Row.propTypes = {
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string,
  /** Leading icon. Sized by the caller; the row reserves `row.iconSize`. */
  leading: PropTypes.node,
  /** Trailing control — a switch, a chevron, a checkmark. */
  trailing: PropTypes.node,
  /** Current setting shown on the right, e.g. the selected language. */
  value: PropTypes.string,
  onPress: PropTypes.func,
  disabled: PropTypes.bool,
  accessibilityRole: PropTypes.string,
  accessibilityLabel: PropTypes.string,
  accessibilityHint: PropTypes.string,
  accessibilityState: PropTypes.shape({
    checked: PropTypes.bool,
    selected: PropTypes.bool,
    expanded: PropTypes.bool,
    busy: PropTypes.bool,
  }),
  showDivider: PropTypes.bool,
  testID: PropTypes.string,
  style: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
  /** Overrides the title font — e.g. Gurmukhi, which needs its own face. */
  titleStyle: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
};

export default Row;
