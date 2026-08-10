import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import PropTypes from "prop-types";
import useTokens from "../../hooks/useTokens";
import Text from "./Text";

// A two-or-more segment switch, for choosing which list a screen shows.
//
// An underlined tab bar rather than a filled pill: this sits directly above a
// flat list on the page's own ground, and a filled control there reads as a
// separate widget dropped onto the page. The underline belongs to the list it
// labels, which is the relationship the two tabs actually have.
//
// The indicator is a 2pt rule in the theme's accent, and the selected label
// takes the accent with it — so the selection never depends on colour alone,
// which matters both for contrast and for anyone who cannot separate the two
// hues. The unselected label stays `textSecondary`, which every theme
// guarantees at 4.5:1 on its ground.
//
// Sized entirely by its content: each segment is `flex: 1` with no fixed
// height, so a label 3–4× longer in Punjabi or Spanish, or a raised OS text
// size, makes the bar taller rather than clipping. `touchTarget` is a floor.
const SegmentedTabs = ({ tabs, value, onChange, style = null }) => {
  const { c, space, layout } = useTokens();

  return (
    <View
      accessibilityRole="tablist"
      style={[
        {
          flexDirection: "row",
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: c.border,
        },
        style,
      ]}
    >
      {tabs.map((tab) => {
        const selected = tab.key === value;
        return (
          <Pressable
            key={tab.key}
            onPress={() => onChange(tab.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={tab.label}
            style={({ pressed }) => ({
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              minHeight: layout.touchTarget,
              paddingHorizontal: space.md_12,
              paddingVertical: space.md_12,
              // Overlaps the container's hairline, so the indicator sits ON the
              // rule rather than above it leaving a seam.
              borderBottomWidth: 2,
              marginBottom: -StyleSheet.hairlineWidth,
              borderBottomColor: selected ? c.accent : "transparent",
              // A tint of the theme's ACCENT, not the ink-based
              // surfaceSelected — an ink wash composites to grey on a light
              // ground and reads as a system highlight rather than the app's.
              backgroundColor: pressed ? c.accentSubtle : "transparent",
            })}
          >
            {/* body, matching a Settings row — these are primary navigation,
                not captions. */}
            <Text variant="body" align="center" color={selected ? "accent" : "textSecondary"}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};

SegmentedTabs.propTypes = {
  tabs: PropTypes.arrayOf(
    PropTypes.shape({ key: PropTypes.string.isRequired, label: PropTypes.string.isRequired })
  ).isRequired,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  style: PropTypes.oneOfType([PropTypes.object, PropTypes.array, PropTypes.number]),
};

export default SegmentedTabs;
