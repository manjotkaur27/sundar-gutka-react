import React from "react";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import PropTypes from "prop-types";
import { BackArrowIcon } from "@common/icons";
import useTokens from "../../hooks/useTokens";
import Text from "./Text";

// One app bar for every screen. Replaces seven separate implementations — five
// `useHeader` hooks plus `DashboardHeader`, `BaniHeader`, the Reader header,
// the Folder header and the EditBaniOrder header — which between them used four
// different heights and four different paddings.
//
// ── Layout ─────────────────────────────────────────────────────────────────
// Three columns, matching the existing `AppBar`: a fixed-width leading slot, a
// flexible centred title, a fixed-width trailing slot. The title is CENTRED,
// which is what the app has always done and what the rest of the screens
// (Database Update, About, Bookmarks) look like.
//
// Columns rather than an absolutely-positioned back arrow: the folder header
// used absolute positioning, so a long Gurmukhi title ran underneath the arrow
// and had to be capped at one line with 48pt of padding to compensate. Fixed
// side slots cannot collide with the centre, so the title is free to wrap.
//
// When there is no back button and no actions, the empty side slots are omitted
// so a title on a root screen centres on the full width rather than on the
// space between two invisible boxes.
//
// The safe-area top inset is added HERE and is not part of `layout.header`: the
// inset is a device fact from the OS, so baking it into a token would make the
// token wrong on every other device.
//
// ── Foreground ─────────────────────────────────────────────────────────────
// The title and the back arrow take `c.headerFg` — brand navy in light, white
// in dark — so the top of every screen is coloured by one token. An `actions`
// icon whose colour carries meaning, such as the destructive delete in Manage
// Downloads, passes its own and is deliberately not swept into this.

const ScreenHeader = ({
  title,
  subtitle = undefined,
  onBack = undefined,
  backAccessibilityLabel = undefined,
  actions = null,
  surface = "background",
  titleVariant = "heading",
  showBorder = true,
  testID = undefined,
}) => {
  const { c, space, layout } = useTokens();
  const insets = useSafeAreaInsets();

  // Both dimensions, not just width: without an explicit height the pressable
  // shrinks to the icon and the tap target drops under the 44pt floor.
  const sideSlot = {
    width: layout.header.actionSize,
    height: layout.header.actionSize,
    alignItems: "center",
    justifyContent: "center",
  };

  return (
    <View
      testID={testID}
      style={{
        backgroundColor: c[surface] ?? surface,
        paddingTop: insets.top,
        borderBottomWidth: showBorder ? layout.borderWidth.hairline : 0,
        borderBottomColor: c.border,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          minHeight: layout.header.minHeight,
          paddingHorizontal: layout.header.paddingHorizontal,
        }}
      >
        {onBack ? (
          <Pressable
            onPress={onBack}
            accessibilityRole="button"
            accessibilityLabel={backAccessibilityLabel}
            hitSlop={layout.hitSlop}
            testID="screen-header-back"
            style={({ pressed }) => [sideSlot, { opacity: pressed ? 0.6 : 1 }]}
          >
            <BackArrowIcon size={layout.header.iconSize} color={c.headerFg} />
          </Pressable>
        ) : null}

        {/* The flexible column. Titles wrap to two lines rather than shrink —
            `adjustsFontSizeToFit` here would render a different title size on
            every screen depending on that screen's own string length. */}
        <View style={{ flex: 1, alignItems: "center", paddingHorizontal: space.xs }}>
          <Text variant={titleVariant} color="headerFg" numberOfLines={2} align="center">
            {title}
          </Text>
          {subtitle ? (
            <Text variant="caption" color="textSecondary" numberOfLines={1} align="center">
              {subtitle}
            </Text>
          ) : null}
        </View>

        {/* Trailing slot. Rendered whenever the leading one is, so the centre
            column stays optically centred rather than pushed off by the arrow. */}
        {actions ? (
          <View style={[sideSlot, { flexDirection: "row", gap: space.xs, width: undefined }]}>
            {actions}
          </View>
        ) : null}
        {!actions && onBack ? <View style={sideSlot} /> : null}
      </View>
    </View>
  );
};

ScreenHeader.propTypes = {
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string,
  /** Omit to render no back affordance (a root screen). */
  onBack: PropTypes.func,
  /** Localised — an icon-only control must announce itself. */
  backAccessibilityLabel: PropTypes.string,
  /** Trailing controls, already sized to `layout.header.actionSize`. */
  actions: PropTypes.node,
  surface: PropTypes.string,
  titleVariant: PropTypes.string,
  /** Turn off when the caller draws its own divider (e.g. GradientDivider). */
  showBorder: PropTypes.bool,
  testID: PropTypes.string,
};

export default ScreenHeader;
