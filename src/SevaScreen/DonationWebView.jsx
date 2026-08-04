import React, { useState, useRef, useCallback } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { WebView } from "react-native-webview";
import PropTypes from "prop-types";
import {
  SafeArea,
  StatusBarComponent,
  CustomText,
  GradientDivider,
  useTheme,
  useBackHandler,
  STRINGS,
} from "@common";
import { AppBar, BackIconComponent } from "@common/components";

/**
 * Android-only donation surface.
 *
 * On Android the OS aggressively kills the React Native process when a Chrome
 * Custom Tab (heavyweight external browser) is foregrounded on top of it, so the
 * donation page is lost the moment the user backgrounds the app. Rendering the
 * Qgiv form in an in-process WebView keeps it inside our single activity, so it
 * survives backgrounding/recents/app-switch unless the whole OS process dies.
 *
 * iOS keeps using InAppBrowser (SFSafariViewController) — see SevaScreen — both
 * because iOS doesn't kill backgrounded processes the same way and to preserve
 * the unambiguous "web handoff" surface Apple's review expects for the
 * 501(c)(3) donation IAP exemption (docs/seva-iap-policy-analysis.md).
 */
const styles = StyleSheet.create({
  container: { flex: 1 },
  centerFill: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
});

const DonationWebView = ({ route, navigation }) => {
  const { theme } = useTheme();
  // The app's standard themed header. Two roles rather than two isDark
  // ternaries: headerFg is brand navy in light and white in dark, exactly as
  // every other header in the app.
  const headerBg = theme.c.background;
  const headerFg = theme.c.headerFg;

  const { url } = route.params || {};
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const webViewRef = useRef(null);
  const canGoBackRef = useRef(false);

  // Back navigates within the donation page first (so a mis-tap during a
  // multi-step payment doesn't abandon it), then exits the screen. Used by both
  // the header back button and the hardware back button for consistency.
  const handleBack = useCallback(() => {
    if (canGoBackRef.current && webViewRef.current) {
      webViewRef.current.goBack();
    } else {
      navigation.goBack();
    }
  }, [navigation]);

  useBackHandler(() => {
    if (canGoBackRef.current && webViewRef.current) {
      webViewRef.current.goBack();
      return true;
    }
    return false; // let React Navigation pop the screen
  });

  return (
    <SafeArea backgroundColor={headerBg}>
      <StatusBarComponent backgroundColor={headerBg} />
      <AppBar
        title={STRINGS.donate}
        backgroundColor={headerBg}
        titleColor={headerFg}
        titleStyle={{
          fontFamily: theme.typography.fonts.balooPaajiSemiBold,
          fontSize: theme.typography.sizes.xxl,
          fontWeight: theme.typography.weights.normal,
        }}
        leftComponent={<BackIconComponent size={30} color={headerFg} onPress={handleBack} />}
      />
      <GradientDivider />
      <View style={[styles.container, { backgroundColor: theme.c.surface }]}>
        {hasError ? (
          <View style={styles.centerFill}>
            <CustomText style={{ color: theme.c.textBrand }}>
              {STRINGS.SOMETHING_WENT_WRONG || "Something went wrong. Please try again."}
            </CustomText>
          </View>
        ) : (
          <WebView
            ref={webViewRef}
            source={{ uri: url }}
            originWhitelist={["*"]}
            onNavigationStateChange={(navState) => {
              canGoBackRef.current = navState.canGoBack;
            }}
            javaScriptEnabled
            domStorageEnabled
            // DataDome bot-protection + Qgiv session rely on cookies across
            // subdomains/redirects; keep them flowing inside the WebView.
            thirdPartyCookiesEnabled
            sharedCookiesEnabled
            // Keep target=_blank / popup payment pages in this same WebView
            // instead of silently dropping them.
            setSupportMultipleWindows={false}
            // NB: no `startInLoadingState` — it renders react-native-webview's
            // own default spinner, which stacked on top of our themed overlay
            // below (two concentric loaders). `isLoading` starts true, so the
            // overlay already covers the initial load on its own.
            onLoadStart={() => setIsLoading(true)}
            onLoadEnd={() => setIsLoading(false)}
            onError={() => {
              setIsLoading(false);
              setHasError(true);
            }}
            // When the Android System WebView (Chromium) renderer process dies
            // out-of-process, react-native-webview's native side returns true so
            // Android does NOT kill our app — but the WebView instance is now dead
            // and would otherwise sit here blank. Swap it for the error fallback so
            // the user gets a clear message and can retry instead of a frozen page.
            // (This cannot catch the in-process/low-memory SIGBUS case, where the
            // native signal tears down the whole process before any handler runs.)
            onRenderProcessGone={() => {
              setIsLoading(false);
              setHasError(true);
            }}
            style={{ backgroundColor: theme.c.surface }}
          />
        )}
        {isLoading && !hasError && (
          <View style={styles.loadingOverlay} pointerEvents="none">
            <ActivityIndicator size="large" color={theme.c.accent} />
          </View>
        )}
      </View>
    </SafeArea>
  );
};

DonationWebView.propTypes = {
  route: PropTypes.shape({
    params: PropTypes.shape({ url: PropTypes.string }),
  }).isRequired,
  navigation: PropTypes.shape({
    goBack: PropTypes.func,
  }).isRequired,
};

export default DonationWebView;
