import React from "react";
import { View } from "react-native";
import PropTypes from "prop-types";
import useTokens from "../../hooks/useTokens";
import Text from "./Text";

// The toast surface. Presentational only — `react-native-toast-message` owns
// showing, positioning and dismissing it (see `common/toastConfig.jsx`), which
// matters because toasts also fire from non-React code such as the download
// manager.
//
// ── The design ─────────────────────────────────────────────────────────────
// A quiet elevated card. Nothing else: no coloured edge bar (the stock look
// every toast library ships), and no status dot. The message states the
// outcome, so colour was carrying nothing the text did not (WCAG 1.4.1), and
// one plain card reads as considered where a decorated one reads as generic.
//
// The message is never truncated and has no fixed width or height. It wraps to
// as many lines as the translation needs, which is the whole reason a toast
// breaks in `hi`/`pa` otherwise.

const Toast = ({ message = undefined, testID = undefined }) => {
  const { c, layout, radii, elevation } = useTokens();

  return (
    <View
      testID={testID}
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
      style={[
        {
          // Capped, not fixed: narrow on a phone, sensible on a tablet.
          width: "100%",
          maxWidth: layout.dialog.maxWidth,
          marginHorizontal: layout.toast.marginHorizontal,
          minHeight: layout.toast.minHeight,
          paddingHorizontal: layout.toast.paddingHorizontal,
          paddingVertical: layout.toast.paddingVertical,
          borderRadius: radii.lg,
          backgroundColor: c.surfaceElevated,
          borderWidth: layout.borderWidth.hairline,
          borderColor: c.border,
          flexDirection: "row",
          alignItems: "center",
        },
        elevation.overlay,
      ]}
    >
      <Text variant="bodySmall" color="textPrimary" style={{ flex: 1 }}>
        {message}
      </Text>
    </View>
  );
};

Toast.propTypes = {
  message: PropTypes.string,
  testID: PropTypes.string,
};

export default Toast;
