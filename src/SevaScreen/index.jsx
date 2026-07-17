import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  AppState,
  Linking,
  Platform,
  Text,
  useWindowDimensions,
} from "react-native";
import LinearGradient from "react-native-linear-gradient";
import Svg, {
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
  Text as SvgText,
} from "react-native-svg";
import { useDispatch, useSelector } from "react-redux";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import PropTypes from "prop-types";
import {
  SafeArea,
  StatusBarComponent,
  CustomText,
  useTheme,
  useThemedStyles,
  STRINGS,
  openInAppBrowser,
  trackSevaEvent,
} from "@common";
import { DonateIcon } from "../common/icons";
import { getSevaConfig, buildQgivUrl, markSevaSeen } from "../services/sevaConfig";
import createStyles from "./styles";
import { parseHtmlBlocks, blockText } from "./utils/parseHtmlBlocks";

// ─── Seva analytics funnel helpers (in-app, observable steps only) ───────────
// donation_type is required on every Seva event and must never be null/empty.
const donationTypeOf = (freq) => (freq === "One Time" ? "one_time" : "recurring");

// amount_bucket is always a non-empty categorical string (never null) so Firebase
// never records "(not set)". The three presets (10/50/100) fall in distinct
// buckets, and a not-yet-typed custom amount is reported as "custom".
const bucketAmount = (amount) => {
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0) return "unknown";
  if (n < 10) return "under_10";
  if (n < 25) return "10_24";
  if (n < 50) return "25_49";
  if (n < 100) return "50_99";
  if (n < 250) return "100_249";
  return "250_plus";
};

// Observable in-app funnel steps. The furthest reached is emitted on exit as
// checkout_abandoned.last_step_reached when the user leaves before the handoff.
const SEVA_STEPS = {
  landing_view: 1,
  donation_type_selected: 2,
  amount_selected: 3,
  payment_started: 4,
};
const SEVA_STEP_NAMES = Object.keys(SEVA_STEPS);
const stepNameOf = (v) => SEVA_STEP_NAMES[v - 1] || "landing_view";

const SevaScreen = () => {
  const { theme } = useTheme();
  const isDarkMode = theme.mode === "dark";
  const styles = useThemedStyles(createStyles);
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  // ─── Responsive metrics ─────────────────────────────────────────────────────
  // Every size below is derived from the viewport and then CLAMPED, so the page
  // scales smoothly between a small phone and a tablet instead of flipping
  // between layouts. Horizontal padding is computed once here and reused for the
  // content AND the headline canvas, so the title always aligns with the text
  // beneath it (previously the title used a separate screenWidth-48 canvas).
  const hPad = Math.round(Math.max(16, Math.min(28, screenWidth * 0.064)));
  const contentWidth = screenWidth - hPad * 2;
  // Fixed vertical rhythm between sections — replaces the old space-between,
  // which stretched/collapsed the gaps depending on the device height.
  const gap = Math.round(Math.min(24, Math.max(14, screenHeight * 0.02)));
  const vPad = Math.round(Math.min(36, Math.max(18, screenHeight * 0.04)));
  // The big "$NN" is bound by height as well as width, so a short device gets a
  // smaller figure instead of a 72px number that squeezes out everything else.
  const amountFontSize = Math.round(
    Math.min(72, Math.max(44, Math.min(screenWidth * 0.17, screenHeight * 0.085)))
  );
  const amountLineHeight = Math.round(amountFontSize * 1.2);
  const dispatch = useDispatch();
  const navigation = useNavigation();

  const language = useSelector((state) => state.language);

  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState(null);
  const [error, setError] = useState(false);

  const [selectedAmount, setSelectedAmount] = useState(10);
  const [isOtherSelected, setIsOtherSelected] = useState(false);
  const [customAmount, setCustomAmount] = useState("");
  const [frequency, setFrequency] = useState("Monthly");

  // Explicit focus for the "Other" amount input — see the effect below.
  const otherAmountInputRef = useRef(null);

  // Tracks the URL currently open in InAppBrowser so we can re-open after app resume
  const pendingBrowserUrlRef = useRef(null);
  // True when the app went to background while the browser was open
  const appInBackgroundRef = useRef(false);
  // Always points to the latest openBrowserForUrl without needing it in useEffect deps
  const openBrowserForUrlRef = useRef(null);
  // Prevents concurrent open() calls (guards iOS where open() may not resolve on background)
  const isBrowserOpenRef = useRef(false);

  // ─── Analytics funnel (intent only) ────────────────────────────────────────
  // These measure in-app funnel behaviour. Actual payment truth lives on Qgiv —
  // we cannot observe completion from here, so "donate_tapped"/"payment_success"
  // represent intent, not confirmed donations.
  const hasDonatedRef = useRef(false);
  const hasInteractedRef = useRef(false);
  const lastFrequencyRef = useRef(frequency);
  // Furthest funnel step reached — emitted as checkout_abandoned.last_step_reached
  // on exit. Starts at landing_view (the screen is on screen as of mount).
  const maxStepRef = useRef(SEVA_STEPS.landing_view);
  const markStep = useCallback((name) => {
    const v = SEVA_STEPS[name] || 0;
    if (v > maxStepRef.current) maxStepRef.current = v;
  }, []);

  // Load config on mount
  useEffect(() => {
    let active = true;
    const fetchConfig = async () => {
      try {
        setLoading(true);
        setError(false);
        const cfg = await getSevaConfig();
        if (active) {
          setConfig(cfg);
          setSelectedAmount(cfg?.selectedAmount ?? 10);
        }
        // The user is now viewing the Seva page — acknowledge the current version
        // so the tab dot clears now and stays cleared until the backend bumps it.
        markSevaSeen();
      } catch (err) {
        if (active) setError(true);
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchConfig();
    return () => {
      active = false;
    };
  }, [language]);

  // Re-acknowledge the version on every FOCUS, not just on mount. This screen
  // lives in a bottom-tab navigator, so it stays mounted after the first visit
  // and the mount effect above never re-runs — meaning a dot that appears
  // LATER in the same session (backend published a new version while the app
  // was open) would stay stuck on the tab even while the user is looking at
  // this very page. markSevaSeen() reads the module-level latestVersion, kept
  // current by BottomNavigation's own foreground refresh, so it acknowledges
  // the right version. Kept as its OWN effect so navigation's identity can
  // never retrigger the config fetch above.
  useEffect(() => {
    const unsubscribeFocus = navigation.addListener("focus", () => {
      markSevaSeen();
    });
    return unsubscribeFocus;
  }, [navigation]);

  // Exposure on mount; abandonment on exit if the user never tapped donate.
  // Also tracks whether this is the user's first time opening the Seva screen
  // (persisted via AsyncStorage) and the initial donation type selection.
  useEffect(() => {
    const STORAGE_KEY = "@seva_screen_opened";
    (async () => {
      let isFirstOpen = false;
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored === null) {
          isFirstOpen = true;
          await AsyncStorage.setItem(STORAGE_KEY, "1");
        }
      } catch (_) {
        // Non-critical — analytics fires without the flag if storage fails.
      }
      trackSevaEvent("opened", {
        is_first_open: isFirstOpen,
        donation_type: donationTypeOf(frequency),
      });
    })();
    return () => {
      // Abandoned only if the user left before the Qgiv handoff. last_step_reached
      // and donation_type are always real, non-empty values.
      if (!hasDonatedRef.current) {
        trackSevaEvent("checkout_abandoned", {
          last_step_reached: stepNameOf(maxStepRef.current),
          interacted: hasInteractedRef.current,
          donation_type: donationTypeOf(lastFrequencyRef.current),
        });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAmountSelect = (amount, isOther = false) => {
    setIsOtherSelected(isOther);
    if (!isOther) {
      setSelectedAmount(amount);
      setCustomAmount("");
    }
    hasInteractedRef.current = true;
    markStep("amount_selected");
    trackSevaEvent("amount_selected", {
      is_custom: isOther,
      amount_bucket: isOther ? "custom" : bucketAmount(amount),
      donation_type: donationTypeOf(frequency),
    });
  };

  const handleCustomAmountChange = (val) => {
    // Only numeric input
    const cleaned = val.replace(/[^0-9]/g, "");
    setCustomAmount(cleaned);
  };

  // The input's `autoFocus` prop only reliably fires on its very first mount —
  // after leaving this screen and coming back (tab screens stay frozen, not
  // unmounted, so the input isn't remounting) it silently no-ops and the
  // cursor never reappears when "Other" is re-selected. Focus explicitly
  // instead, every time isOtherSelected turns true, with a brief delay so the
  // native view is ready to accept it.
  useEffect(() => {
    if (!isOtherSelected) return undefined;
    const timer = setTimeout(() => otherAmountInputRef.current?.focus(), 100);
    return () => clearTimeout(timer);
  }, [isOtherSelected]);

  // Re-open the keyboard when the amount is tapped while already in "Other".
  // The effect above only fires on the false→true switch, so after the user
  // dismisses the keyboard (e.g. hardware back) without leaving "Other",
  // nothing re-focuses the input. On Android the TextInput can also keep RN
  // focus after a keyboard dismiss, making a plain focus() a no-op — so blur
  // first, then focus, to force the keyboard to reappear.
  const focusOtherAmount = () => {
    const input = otherAmountInputRef.current;
    if (!input) return;
    input.blur();
    setTimeout(() => otherAmountInputRef.current?.focus(), 50);
  };

  const handleFrequencyChange = (freq) => {
    setFrequency(freq);
    lastFrequencyRef.current = freq;
    hasInteractedRef.current = true;
    markStep("donation_type_selected");
    trackSevaEvent("frequency_changed", {
      frequency: freq,
      donation_type: donationTypeOf(freq),
    });
  };

  const effectiveDonationType = donationTypeOf(frequency);

  // ─── Shared browser helper ─────────────────────────────────────────────────
  const openBrowserForUrl = useCallback(
    async (url) => {
      if (isBrowserOpenRef.current) return;

      const barColor = isDarkMode ? "#041126" : theme.colors.surface;
      const controlColor = isDarkMode ? "#FAF9F6" : "#113979";

      isBrowserOpenRef.current = true;
      pendingBrowserUrlRef.current = url;
      appInBackgroundRef.current = false;

      try {
        await openInAppBrowser(url, { barColor, controlColor });
      } finally {
        isBrowserOpenRef.current = false;
        // Only clear the pending URL if the browser closed because the user dismissed it,
        // not because the OS backgrounded the app (in which case we want to re-open on resume).
        if (!appInBackgroundRef.current) {
          pendingBrowserUrlRef.current = null;
        }
      }
    },
    [isDarkMode, theme]
  );

  // Keep ref current so the AppState listener always calls the latest closure
  openBrowserForUrlRef.current = openBrowserForUrl;

  // Re-open the browser if the app was backgrounded while it was showing
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "background") {
        appInBackgroundRef.current = true;
      } else if (nextState === "active" && appInBackgroundRef.current) {
        appInBackgroundRef.current = false;
        const url = pendingBrowserUrlRef.current;
        if (url) {
          // Brief delay to let the native bridge settle after the app resumes
          setTimeout(() => {
            if (pendingBrowserUrlRef.current) {
              openBrowserForUrlRef.current?.(url);
            }
          }, 300);
        }
      }
    });
    return () => {
      subscription.remove();
      pendingBrowserUrlRef.current = null;
      appInBackgroundRef.current = false;
      isBrowserOpenRef.current = false;
    };
  }, []);

  const handleDonate = useCallback(async () => {
    let finalAmount = isOtherSelected ? parseFloat(customAmount) : selectedAmount;
    if (isNaN(finalAmount) || finalAmount <= 0) {
      finalAmount = 10; // Fallback
    }

    hasDonatedRef.current = true;
    markStep("payment_started");
    // Last in-app observable step: the Donate tap hands off to Qgiv. This is
    // payment INTENT, not a confirmed donation — Qgiv holds payment truth and
    // the app cannot see it. Every param here is a real, non-empty value.
    trackSevaEvent("payment_started", {
      provider: "qgiv",
      is_custom: isOtherSelected,
      amount_bucket: bucketAmount(finalAmount),
      donation_type: effectiveDonationType,
    });

    const url = buildQgivUrl({
      amount: finalAmount,
      isCustomAmount: isOtherSelected,
      donationType: effectiveDonationType,
      frequency,
    });

    // Platform split for the PAYMENT surface (see DonationWebView.jsx):
    // - Android: in-process WebView screen so the page survives backgrounding
    //   (Android kills the RN process when a Chrome Custom Tab runs on top).
    // - iOS: InAppBrowser/SFSafariViewController — no backgrounding kill there,
    //   and it preserves the web-handoff surface Apple review expects.
    // Both branches launch synchronously (no await) so payment_success fires at
    // the same point — on browser-open — on both platforms. openBrowserForUrl
    // manages its own async lifecycle (and the resume re-open) internally.
    if (Platform.OS === "android") {
      navigation.navigate("DonationWebView", { url });
    } else {
      openBrowserForUrl(url);
    }

    // Qgiv handoff opened — counted as a successful donation per product
    // decision (the app cannot observe Qgiv's real confirmation). Fired at the
    // same point on both platforms. Params are always real, non-empty values.
    trackSevaEvent("payment_success", {
      provider: "qgiv",
      amount_bucket: bucketAmount(finalAmount),
      donation_type: effectiveDonationType,
    });
  }, [
    isOtherSelected,
    customAmount,
    selectedAmount,
    effectiveDonationType,
    frequency,
    dispatch,
    navigation,
    openBrowserForUrl,
    markStep,
  ]);

  const handleOpenSource = () => {
    openBrowserForUrl("https://github.com/KhalisFoundation/sundar-gutka-react");
  };

  const content = config?.content ?? {};

  // ─── Clip-proof gradient headline (light mode) ──────────────────────────────
  // SVG <Text> has no adjustsFontSizeToFit, so it cannot shrink itself — the old
  // fixed 52px floor on a fixed screenWidth-48 canvas meant the Gurmukhi title
  // simply overflowed and got sliced on narrower screens. Instead we draw the
  // text at a constant size inside a viewBox and let react-native-svg scale that
  // whole box down to the available width (preserveAspectRatio). The per-glyph
  // advance below is deliberately a GENEROUS estimate: over-estimating only
  // renders the title slightly smaller, which is the safe failure mode —
  // under-estimating would clip it again.
  const HEADLINE_BASE_FONT = 72;

  // Tax messaging differs by donor country: US donations are tax-deductible;
  // donations from outside the US are not. Country comes from the backend Seva
  // config (defaults to "US" when unknown).
  const isUSDonor = (config?.country ?? "US").toUpperCase() === "US";
  const taxMessage = isUSDonor ? content.taxMessage : content.nonUsTaxMessage;

  // BOTH themes render through this one SVG path so their size, weight and
  // geometry are identical by construction — only the fill differs (the blue
  // gradient in light mode, flat white in dark). Dark mode previously used a
  // separate plain <Text>, whose independent responsive font-size made the
  // heading render visibly smaller/lighter than light mode's.
  //
  // SVG <Text> cannot auto-shrink like RN's adjustsFontSizeToFit, so it is
  // scaled via the viewBox instead. The per-glyph advance below is
  // deliberately a GENEROUS estimate: over-estimating only renders the title
  // slightly smaller, which is the safe failure mode — under-estimating would
  // clip it. Takes the text as an argument so the same renderer serves both
  // the native fallback (config.content.headline) and a server-driven <h1>.
  const renderHeadline = (headlineText) => {
    if (!headlineText) return null;
    const headlineBoxW = Math.max(headlineText.length * HEADLINE_BASE_FONT * 0.62, 1);
    const headlineBoxH = HEADLINE_BASE_FONT * 1.35;
    const headlineSvgW = Math.min(contentWidth, headlineBoxW);
    const headlineSvgH = (headlineSvgW / headlineBoxW) * headlineBoxH;

    return (
      <Svg
        width={headlineSvgW}
        height={headlineSvgH}
        viewBox={`0 0 ${headlineBoxW} ${headlineBoxH}`}
        preserveAspectRatio="xMidYMid meet"
      >
        <Defs>
          <SvgLinearGradient id="headlineGrad" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#113979" stopOpacity="1" />
            <Stop offset="1" stopColor="#1F69DF" stopOpacity="1" />
          </SvgLinearGradient>
        </Defs>
        <SvgText
          fill={isDarkMode ? theme.staticColors.WHITE_COLOR : "url(#headlineGrad)"}
          fontSize={HEADLINE_BASE_FONT}
          fontWeight="800"
          fontFamily="BalooPaaji2-SemiBold"
          textAnchor="middle"
          x={headlineBoxW / 2}
          y={HEADLINE_BASE_FONT}
        >
          {headlineText}
        </SvgText>
      </Svg>
    );
  };

  // Renders one server-driven `{type:"html"}` segment as real native elements.
  // Deliberately NOT a WebView: native layout is synchronous and always the
  // right height, so the page's own ScrollView stays the single scroll surface
  // (no inner scrollbar, no clipped tail), and the headline keeps its SVG
  // gradient. Styling comes from the app's themed StyleSheet — the same styles
  // the native fallback path uses — so light/dark mode keeps working.
  const renderHtmlSegment = (html, keyPrefix) =>
    parseHtmlBlocks(html).map((block, i) => {
      const key = `${keyPrefix}-block-${i}`;
      if (block.tag === "h1" || block.tag === "h2" || block.tag === "h3") {
        return <React.Fragment key={key}>{renderHeadline(blockText(block))}</React.Fragment>;
      }
      // The footer sits below the Donate button and is smaller/centred/muted,
      // unlike the main description — matching the original native page.
      const isFooter = block.className.includes("seva-footer");
      const blockStyle = isFooter ? styles.footerText : styles.description;
      return (
        <Text key={key} style={blockStyle}>
          {block.segments.map((seg, j) =>
            seg.link ? (
              <Text
                // eslint-disable-next-line react/no-array-index-key
                key={j}
                style={isFooter ? blockStyle : styles.link}
                onPress={() => openBrowserForUrl(seg.url)}
              >
                {seg.text}
              </Text>
            ) : (
              // eslint-disable-next-line react/no-array-index-key
              <Text key={j}>{seg.text}</Text>
            )
          )}
        </Text>
      );
    });

  const renderDescription = () => {
    const text = content.description || "";
    const links = content.descriptionLinks || [];
    if (!links.length) return <Text style={styles.description}>{text}</Text>;

    const positioned = links
      .map((l) => ({ ...l, index: text.indexOf(l.text) }))
      .filter((l) => l.index !== -1)
      .sort((a, b) => a.index - b.index);

    const segments = [];
    let cursor = 0;
    positioned.forEach(({ text: linkText, url, index }) => {
      if (index > cursor) segments.push({ text: text.slice(cursor, index), link: false });
      segments.push({ text: linkText, url, link: true });
      cursor = index + linkText.length;
    });
    if (cursor < text.length) segments.push({ text: text.slice(cursor), link: false });

    return (
      <Text style={styles.description}>
        {segments.map((seg, i) =>
          seg.link ? (
            <Text key={i} style={styles.link} onPress={() => openBrowserForUrl(seg.url)}>
              {seg.text}
            </Text>
          ) : (
            <Text key={i}>{seg.text}</Text>
          )
        )}
      </Text>
    );
  };
  const FREQUENCY_LABELS = {
    Monthly: STRINGS.SEVA_MONTHLY,
    Annually: STRINGS.SEVA_ANNUALLY,
    "One Time": STRINGS.SEVA_ONE_TIME,
  };

  const getFrequencyLabel = () =>
    frequency === "Annually" ? STRINGS.SEVA_PER_YEAR : STRINGS.SEVA_PER_MONTH;

  // When Other is selected but user hasn't typed yet, show the last preset in the card
  const displayAmount =
    isOtherSelected && customAmount ? customAmount : String(selectedAmount ?? "");

  const amounts = config?.amounts ?? [10, 50, 100];

  // Extracted so they can render at their `<!--SLOT:donate_widget-->`
  // / `<!--SLOT:tax_note-->` position within server-driven content — or, when
  // there's no backend content yet, at their fixed native-fallback position
  // below. All handlers/state stay exactly as before; only the position is
  // now dynamic.
  const renderDonateWidget = () => (
    <>
      {/* Amount card — static display OR inline input when Other is selected.
          The whole card is the tap target in "Other" mode so the keyboard
          re-opens on tapping anywhere on it, not just the thin cursor line. */}
      <Pressable style={styles.amountCard} onPress={isOtherSelected ? focusOtherAmount : undefined}>
        <View style={styles.amountContainer}>
          <View style={styles.amountRow}>
            {/* amountFontSize/amountLineHeight are viewport-derived (see the
                metrics block above) so the figure shrinks on short screens
                instead of squeezing the rest of the page. The "$" and the
                digits must share the SAME size + lineHeight to stay on one
                baseline — keep them in lockstep. */}
            <CustomText
              style={[styles.currency, { fontSize: amountFontSize, lineHeight: amountLineHeight }]}
            >
              $
            </CustomText>
            {isOtherSelected ? (
              <View style={styles.amountInputWrap}>
                <TextInput
                  ref={otherAmountInputRef}
                  style={[
                    styles.amountDisplay,
                    { fontSize: amountFontSize, lineHeight: amountLineHeight },
                  ]}
                  value={customAmount}
                  onChangeText={handleCustomAmountChange}
                  keyboardType="numeric"
                  cursorColor={isDarkMode ? theme.staticColors.WHITE_COLOR : "#2C5282"}
                  selectionColor={isDarkMode ? theme.staticColors.WHITE_COLOR : "#2C5282"}
                />
                {customAmount === "" && (
                  <CustomText
                    style={[
                      styles.amountDisplay,
                      styles.amountPlaceholder,
                      { fontSize: amountFontSize, lineHeight: amountLineHeight },
                    ]}
                    pointerEvents="none"
                  >
                    0
                  </CustomText>
                )}
              </View>
            ) : (
              <CustomText
                style={[
                  styles.amountDisplay,
                  { fontSize: amountFontSize, lineHeight: amountLineHeight },
                ]}
              >
                {displayAmount}
              </CustomText>
            )}
          </View>
          {frequency !== "One Time" && (
            <CustomText style={styles.perMonth}>/{getFrequencyLabel()}</CustomText>
          )}
        </View>
      </Pressable>

      {/* Preset amounts */}
      <View style={styles.amountButtons}>
        {amounts.map((amount) => (
          <Pressable
            key={amount}
            style={[
              styles.amountButton,
              selectedAmount === amount && !isOtherSelected && styles.amountButtonSelected,
            ]}
            onPress={() => handleAmountSelect(amount)}
          >
            <CustomText
              style={[
                styles.amountButtonText,
                selectedAmount === amount && !isOtherSelected && styles.amountButtonTextSelected,
              ]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.75}
            >
              ${amount}
            </CustomText>
          </Pressable>
        ))}
        <Pressable
          style={[styles.amountButton, isOtherSelected && styles.amountButtonSelected]}
          onPress={() => handleAmountSelect(null, true)}
        >
          {/* "Other" is the longest label and the one that used to wrap onto
              its own line on narrow screens — shrink-to-fit keeps the row
              intact in every locale. */}
          <CustomText
            style={[styles.amountButtonText, isOtherSelected && styles.amountButtonTextSelected]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
          >
            {STRINGS.SEVA_OTHER}
          </CustomText>
        </Pressable>
      </View>

      {/* Frequency / donation type */}
      <View style={styles.frequencyContainer}>
        {["Monthly", "One Time"].map((freq) => (
          <Pressable
            key={freq}
            style={styles.frequencyOption}
            onPress={() => handleFrequencyChange(freq)}
          >
            <View style={styles.radioButton}>
              {frequency === freq && <View style={styles.radioButtonSelected} />}
            </View>
            <CustomText style={styles.frequencyText}>{FREQUENCY_LABELS[freq]}</CustomText>
          </Pressable>
        ))}
      </View>

      {/* Donate button */}
      <Pressable style={styles.donateButton} onPress={handleDonate}>
        <LinearGradient
          colors={
            isDarkMode ? [theme.colors.primary, theme.colors.primary] : ["#113979", "#0C2958"]
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            borderRadius: 100,
            paddingHorizontal: 18,
            paddingVertical: 14,
          }}
        >
          <DonateIcon size={30} color="#FFFFFF" />
          <CustomText style={styles.donateButtonText}>{STRINGS.donate}</CustomText>
        </LinearGradient>
      </Pressable>
    </>
  );

  // Tax note — depends on the donor's country (US = tax-deductible). Always
  // native/country-conditional, both here and in server-driven content (see
  // the tax_note slot below) — raw backend HTML text cannot express this.
  const renderTaxNote = () =>
    taxMessage ? <CustomText style={styles.taxNote}>{taxMessage}</CustomText> : null;

  // Server-driven content, split into an ordered sequence of HTML
  // fragments + native slots by parseSevaContent (see services/sevaConfig.js).
  // sevaConfig.js always falls back to its own bundled default content when
  // there's no real backend content yet, so this is effectively never empty
  // in practice — the native STRINGS-driven rendering below only exists as a
  // defensive safety net in case parseSevaContent ever legitimately returns [].
  const segments = config?.content?.segments ?? [];

  // ─── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeArea
        backgroundColor={isDarkMode ? "#041126" : theme.colors.surface}
        edges={["left", "right"]}
      >
        <StatusBarComponent />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeArea>
    );
  }

  // ─── Error / offline ──────────────────────────────────────────────────────
  if (error) {
    return (
      <SafeArea
        backgroundColor={isDarkMode ? "#041126" : theme.colors.surface}
        edges={["left", "right"]}
      >
        <StatusBarComponent />
        <View style={styles.centered}>
          <CustomText style={styles.description}>{STRINGS.SEVA_LOAD_ERROR}</CustomText>
          <Pressable onPress={() => Linking.openURL("https://khalisfoundation.org/donate")}>
            <CustomText style={[styles.description, { color: theme.colors.primary }]}>
              {STRINGS.SEVA_DONATE_DIRECTLY}
            </CustomText>
          </Pressable>
        </View>
      </SafeArea>
    );
  }

  // ─── Main screen ──────────────────────────────────────────────────────────
  return (
    <SafeArea
      backgroundColor={isDarkMode ? "#041126" : theme.colors.surface}
      edges={["left", "right"]}
    >
      <StatusBarComponent />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View
          style={[
            styles.container,
            { paddingHorizontal: hPad, paddingTop: vPad, paddingBottom: vPad, gap },
          ]}
        >
          {segments.length > 0 ? (
            // Server-driven content: HTML fragments render as real native
            // elements and native slots (donate_widget/tax_note) as their real
            // components, in exactly the order the backend's content string
            // places them. Everything is a plain child of the page's own
            // ScrollView, so the WHOLE page scrolls as one unit when the
            // content doesn't fit (large font / small screen) — there is no
            // inner scroll surface and nothing can be clipped.
            segments.map((seg, i) => {
              if (seg.type === "html") {
                return (
                  <React.Fragment key={`seva-seg-${i}`}>
                    {renderHtmlSegment(seg.value, `seva-seg-${i}`)}
                  </React.Fragment>
                );
              }
              if (seg.name === "donate_widget") {
                return (
                  <React.Fragment key={`seva-seg-${i}`}>{renderDonateWidget()}</React.Fragment>
                );
              }
              if (seg.name === "tax_note") {
                return <React.Fragment key={`seva-seg-${i}`}>{renderTaxNote()}</React.Fragment>;
              }
              return null;
            })
          ) : (
            // Native fallback — used until the backend content is populated
            // (or offline first-launch with nothing cached yet). Identical to
            // the page's original, pre-server-driven-content rendering.
            <>
              {renderHeadline(content.headline)}
              {renderDescription()}
              {renderDonateWidget()}
              {renderTaxNote()}
              <Pressable onPress={handleOpenSource}>
                <CustomText style={styles.footerText}>{content.footerText}</CustomText>
              </Pressable>
            </>
          )}
        </View>
      </ScrollView>
    </SafeArea>
  );
};

SevaScreen.propTypes = {
  navigation: PropTypes.object,
};

export default SevaScreen;
