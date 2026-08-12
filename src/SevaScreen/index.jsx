import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Pressable,
  TextInput,
  ActivityIndicator,
  Animated,
  AppState,
  Linking,
  Platform,
  Text,
  useWindowDimensions,
} from "react-native";
import LinearGradient from "react-native-linear-gradient";
import { useDispatch, useSelector } from "react-redux";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { paletteFor, themeForScreen } from "@theme/screenPalettes";
import PropTypes from "prop-types";
import { ScreenHeader } from "@common/components/ui";
import {
  SafeArea,
  StatusBarComponent,
  CustomText,
  GradientDivider,
  useTheme,
  useThemedStyles,
  STRINGS,
  openInAppBrowser,
  trackSevaEvent,
  useCustomScrollbar,
} from "@common";
import {
  DonateIcon,
  CloseIcon,
  ChevronRight,
  HandHeartIcon,
  MegaphoneIcon,
  CodeIcon,
  ClipboardCheckIcon,
  ExternalLinkIcon,
  StarIcon,
} from "../common/icons";
import {
  resolveCurrency,
  usdToLocal,
  localToUsd,
  formatNumber,
  resolveLocalPresets,
} from "../services/currency";
import { initExchangeRates } from "../services/exchangeRates";
import { getSevaConfig, buildQgivUrl, markSevaSeen } from "../services/sevaConfig";
import { prewarmSevaMeans } from "../services/sevaMeans";
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

// "Other ways to do Seva" list items: each server-driven means link
// (`seva-means:<page>`) maps to a native icon + accent tint. The app supplies
// the icon/colour/navigation chrome; the backend supplies the text + order.
const MEANS_META = {
  // One hue per means — indigo / teal / green / gold. They are fixed in both
  // themes: the hue is what tells the rows apart, so it is not a role. The
  // values live in the Seva palette, keyed by these same page names.
  social: { Icon: MegaphoneIcon },
  coding: { Icon: CodeIcon },
  qa: { Icon: ClipboardCheckIcon },
  other: { Icon: StarIcon },
};

// A blinking text cursor for the custom-amount inline display (the real
// TextInput is hidden — see the amount card — so the ₹ symbol and the digits
// can be rendered as one baseline-aligned inline Text).
const BlinkingCursor = ({ color, fontSize }) => {
  const opacity = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0, duration: 450, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 450, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);
  return (
    <Animated.Text style={{ opacity, color, fontSize, fontFamily: "sans-serif" }}>|</Animated.Text>
  );
};

BlinkingCursor.propTypes = {
  color: PropTypes.string.isRequired,
  fontSize: PropTypes.number.isRequired,
};

const SevaScreen = () => {
  const { theme } = useTheme();
  // Seva's own colours, through the same role names — see theme/screenPalettes.
  const { c } = themeForScreen(theme, "seva");
  const palette = paletteFor("seva", theme);
  const isDarkMode = theme.mode === "dark";
  const styles = useThemedStyles(createStyles);
  // The app-wide themed scrollbar, not the unthemed native one.
  const { scrollViewProps, Indicator } = useCustomScrollbar();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  // ─── Responsive metrics ─────────────────────────────────────────────────────
  // Every size below is derived from the viewport and then CLAMPED, so the page
  // scales smoothly between a small phone and a tablet instead of flipping
  // between layouts.
  const hPad = Math.round(Math.max(16, Math.min(28, screenWidth * 0.064)));
  // Fixed vertical rhythm between sections — replaces the old space-between,
  // which stretched/collapsed the gaps depending on the device height.
  const gap = Math.round(Math.min(24, Math.max(14, screenHeight * 0.02)));
  const vPad = Math.round(Math.min(36, Math.max(18, screenHeight * 0.04)));
  // The big amount is bound by height as well as width, so a short device gets a
  // smaller figure instead of one that squeezes out everything else. Capped
  // lower than before so the amount BOX is shorter (per SIO-155), and so a large
  // localised figure (e.g. ₹10,000) plus the inline "/month" still fits one row.
  const amountFontSize = Math.round(
    Math.min(52, Math.max(34, Math.min(screenWidth * 0.13, screenHeight * 0.062)))
  );
  const amountLineHeight = Math.round(amountFontSize * 1.12);
  const dispatch = useDispatch();
  const navigation = useNavigation();

  const language = useSelector((state) => state.language);

  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState(null);
  const [error, setError] = useState(false);

  // Donor currency (symbol + display-figure conversion). Prefers the backend's
  // IP-resolved countryCode (config?.countryCode) once the config has loaded;
  // falls back to the device locale before that (first render, offline, or
  // when the backend sent no country header) — resolveCurrency(undefined)
  // does exactly that internally. Recomputed every render, so this updates
  // automatically the moment `config` lands. The charge itself is always USD
  // via Qgiv — see services/currency.js. MUST stay below the `config` useState
  // above — it was previously placed before it, silently reading `config` as
  // undefined on every render (the useState call hadn't executed yet in that
  // render pass), so it always fell back to the device locale regardless of
  // what the backend actually sent.
  const currency = resolveCurrency(config?.countryCode);
  // Digits ALWAYS render in Baloo Paaji. Only the currency SYMBOL may need a
  // different font: Baloo can't draw ₹ correctly, so INR's symbol uses the
  // system font; every other currency's symbol stays Baloo (they render fine).
  // Symbol + digits are rendered as inline text spans (see the amount card), so
  // they share one baseline and align regardless of the symbol's font.
  const symbolFontFamily =
    currency.code === "INR" ? "sans-serif" : theme.typography.fonts.balooPaaji;
  // The system-font ₹ renders TALLER than the Baloo digits at the same size, so
  // scale the symbol DOWN to match their height. Non-INR symbols are Baloo (same
  // font as the digits) and already match → scale 1.
  const symbolFontSize = Math.round(amountFontSize * (currency.code === "INR" ? 0.82 : 1));

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

  // Prewarm all four "Seva by other means" pages for the current language so a
  // single online visit to Seva caches every sub-page for later offline use.
  useEffect(() => {
    prewarmSevaMeans({ lang: language }).catch(() => {});
  }, [language]);

  // Sync the Seva config on EVERY open (screen focus) and on language change:
  //   • Online → re-fetches the latest Seva page from the server every time it's
  //     opened, so a returning online user always sees current content.
  //   • Offline, returning user → resolves to the LAST cached (last successfully
  //     synced) Seva page.
  //   • Offline, brand-new user → resolves to the bundled fallback.
  // getSevaConfig implements that network → cache → bundled chain and never
  // throws. The loading spinner shows ONLY on the very first load; every re-open
  // refreshes SILENTLY in the background so the currently-shown page never
  // blanks while it revalidates. markSevaSeen() runs on every focus so the tab's
  // version dot clears the moment the page is opened.
  const hasLoadedRef = useRef(false);
  useFocusEffect(
    useCallback(() => {
      let active = true;
      const isFirstLoad = !hasLoadedRef.current;
      (async () => {
        try {
          if (isFirstLoad) {
            setLoading(true);
            setError(false);
          }
          // Warm live FX rates (from cache — fast) before resolving the config,
          // so the very first render's donation tiers + default are already in
          // real, correctly-converted local figures (no fallback-then-swap
          // flicker). The daily network refresh it triggers is fire-and-forget.
          await initExchangeRates();
          const cfg = await getSevaConfig(language);
          if (!active) return;
          setConfig(cfg);
          if (isFirstLoad) {
            // Resolve currency FRESH from cfg?.countryCode here rather than
            // using the outer `currency` — that outer value was captured when
            // this effect closure was created (mount time, before cfg existed)
            // and does not reflect the countryCode that just arrived in cfg.
            // Using the stale value would default-select an amount in the
            // wrong currency's ladder for one render, until the next re-render
            // silently swapped the displayed symbol out from under it.
            const effectiveCurrency = resolveCurrency(cfg?.countryCode);
            // Default to the first tier of the resolved LOCAL ladder — backend
            // per-currency override, else the currency's built-in ladder (INR),
            // else the backend USD base amounts converted to local. Only on the
            // first load, so a background re-sync never resets a user's pick.
            const [defaultLocal] = resolveLocalPresets(
              effectiveCurrency,
              cfg?.amounts,
              cfg?.amountPresets
            );
            setSelectedAmount(defaultLocal ?? usdToLocal(10, effectiveCurrency));
          }
          hasLoadedRef.current = true;
          markSevaSeen();
        } catch (err) {
          if (active && isFirstLoad) setError(true);
        } finally {
          if (active && isFirstLoad) setLoading(false);
        }
      })();
      return () => {
        active = false;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [language])
  );

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

  // Tapping the figure is how people expect to edit it, so it switches to
  // "Other" itself rather than doing nothing until the Other chip is pressed.
  // Selecting Other flips isOtherSelected, and the effect above focuses the
  // input; when already in Other there is no state change to trigger it, so
  // refocus directly.
  const handleAmountPress = () => {
    if (isOtherSelected) {
      focusOtherAmount();
      return;
    }
    handleAmountSelect(null, true);
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

      const barColor = c.surface;
      const controlColor = c.textPrimary;

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
    // Both the selected preset and a typed custom amount are in the LOCAL
    // currency — convert to USD, because Qgiv charges in USD. (See
    // services/currency.js: figures are localised, the charge is not.)
    const localAmount = isOtherSelected ? customAmount : selectedAmount;
    let finalAmount = localToUsd(localAmount, currency);
    if (Number.isNaN(finalAmount) || finalAmount <= 0) {
      finalAmount = 10; // Fallback (USD)
    }

    hasDonatedRef.current = true;
    markStep("payment_started");
    // Last in-app observable step: the Donate tap hands off to Qgiv. This is
    // payment INTENT, not a confirmed donation — Qgiv holds payment truth and
    // the app cannot see it. Every param here is a real, non-empty value.
    // amount_bucket stays USD-based so the analytics funnel is comparable
    // across regions regardless of the displayed currency.
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
    currency,
    effectiveDonationType,
    frequency,
    dispatch,
    navigation,
    openBrowserForUrl,
    markStep,
  ]);

  const content = config?.content ?? {};

  // Tax messaging differs by donor country: US donations are tax-deductible;
  // donations from outside the US are not. Country comes from the backend Seva
  // config (defaults to "US" when unknown). BUT when offline with nothing ever
  // cached (source === "fallback"), the country is a pure guess — so we show NO
  // tax note at all rather than a possibly-wrong US-specific claim (SIO-155).
  const isOfflineFallback = config?.source === "fallback";
  const isUSDonor = (config?.country ?? "US").toUpperCase() === "US";
  let taxMessage = null;
  if (!isOfflineFallback) {
    taxMessage = isUSDonor ? content.taxMessage : content.nonUsTaxMessage;
  }

  // One "Other ways to do Seva" row, from a server `seva-means:<page>` link
  // block. The backend supplies the title (link text) + subtitle (trailing
  // text) + which page; the app supplies the icon, accent tint, and the native
  // navigation to the SDUI page — the only non-content pieces.
  //
  // A row may also carry `?open=<encoded url>`. That means "open this URL in
  // the in-app browser instead of navigating", for rows whose sub-page would
  // hold a single link. The page key before the `?` still drives the icon.
  const renderMeansItem = (block, key) => {
    const linkSeg = block.segments.find((s) => s.link);
    const subSeg = block.segments.find((s) => !s.link && s.text.trim());
    const title = linkSeg ? linkSeg.text : blockText(block);
    const sub = subSeg ? subSeg.text.trim() : "";
    const target =
      linkSeg && linkSeg.url && linkSeg.url.startsWith("seva-means:")
        ? linkSeg.url.slice("seva-means:".length)
        : null;
    const [page, query] = target ? target.split("?") : [null, ""];
    const openMatch = query && query.match(/(?:^|&)open=([^&]*)/);
    let openUrl = null;
    if (openMatch) {
      try {
        openUrl = decodeURIComponent(openMatch[1]);
      } catch {
        openUrl = null;
      }
    }
    const meta = MEANS_META[page] || MEANS_META.other;
    const { Icon } = meta;
    const meansTint = palette.meansTints[page] || palette.meansTints.other;
    const trailingIconColor = c.textSecondary;
    return (
      <Pressable
        key={key}
        style={styles.meansRow}
        onPress={() => {
          if (openUrl) openBrowserForUrl(openUrl);
          else if (page) navigation.navigate("SevaMeans", { page });
        }}
        accessibilityRole={openUrl ? "link" : "button"}
        accessibilityLabel={`seva-means-${page}`}
      >
        {/* The disc behind the icon is the same hue at 13% opacity. */}
        <View style={[styles.meansIconCircle, { backgroundColor: `${meansTint}22` }]}>
          <Icon size={20} color={meansTint} />
        </View>
        <View style={styles.meansTextWrap}>
          <CustomText style={styles.meansTitle}>{title}</CustomText>
          {!!sub && <CustomText style={styles.meansSub}>{sub}</CustomText>}
        </View>
        {/* Chevron means "another screen in the app"; the external-link mark
            means "this leaves the app for a browser". */}
        {openUrl ? (
          <ExternalLinkIcon size={19} color={trailingIconColor} />
        ) : (
          <ChevronRight size={20} color={trailingIconColor} />
        )}
      </Pressable>
    );
  };

  // Renders one server-driven `{type:"html"}` segment as native elements, using
  // the backend's class hints to pick the matching style/component. NOT a
  // WebView — native layout keeps the page's own ScrollView the single scroll
  // surface, and light/dark theming stays app-owned.
  const renderHtmlSegment = (html, keyPrefix) =>
    parseHtmlBlocks(html).map((block, i) => {
      const key = `${keyPrefix}-block-${i}`;
      const cls = block.className || "";

      if (cls.includes("seva-means")) return renderMeansItem(block, key);

      if (cls.includes("seva-hero-title")) {
        return (
          <CustomText key={key} style={styles.heroTitle}>
            {blockText(block)}
          </CustomText>
        );
      }
      if (cls.includes("seva-section")) {
        return (
          <CustomText key={key} style={styles.sectionHeader}>
            {blockText(block)}
          </CustomText>
        );
      }
      if (cls.includes("seva-card-title")) {
        return (
          <CustomText key={key} style={styles.cardTitle}>
            {blockText(block)}
          </CustomText>
        );
      }
      if (cls.includes("seva-card-sub")) {
        return (
          <CustomText key={key} style={styles.cardSub}>
            {blockText(block)}
          </CustomText>
        );
      }
      // Plain (unclassed) headings → section-header style.
      if (block.tag === "h1" || block.tag === "h2" || block.tag === "h3") {
        return (
          <CustomText key={key} style={styles.sectionHeader}>
            {blockText(block)}
          </CustomText>
        );
      }

      const isFooter = cls.includes("seva-footer");
      let blockStyle = styles.description;
      if (cls.includes("seva-hero-desc")) blockStyle = styles.heroDesc;
      else if (isFooter) blockStyle = styles.footerText;
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

  const FREQUENCY_LABELS = {
    Monthly: STRINGS.SEVA_MONTHLY,
    Annually: STRINGS.SEVA_ANNUALLY,
    "One Time": STRINGS.SEVA_ONE_TIME,
  };

  const getFrequencyLabel = () =>
    frequency === "Annually" ? STRINGS.SEVA_PER_YEAR : STRINGS.SEVA_PER_MONTH;

  // The big figure in the card. A custom ("Other") amount is typed in the local
  // currency, so it's shown as-is; a selected preset is a USD base tier shown as
  // its localised, grouped display figure (e.g. $10 → "1,000" for ₹). The
  // currency symbol is rendered separately alongside it.
  const displayAmount = formatNumber(
    isOtherSelected && customAmount ? customAmount : selectedAmount ?? 0
  );

  // Preset tiers, in the LOCAL currency, resolved in priority order: a backend
  // per-currency override (config.amountPresets[code]), else the currency's own
  // round ladder (INR → ₹100 / ₹1,000 / ₹5,000), else the backend USD base
  // amounts × rate. selectedAmount + customAmount are LOCAL; both convert to USD
  // only at donate time (Qgiv charges USD).
  const amounts = resolveLocalPresets(currency, config?.amounts, config?.amountPresets);

  // Extracted so they can render at their `<!--SLOT:donate_widget-->`
  // / `<!--SLOT:tax_note-->` position within server-driven content — or, when
  // there's no backend content yet, at their fixed native-fallback position
  // below. All handlers/state stay exactly as before; only the position is
  // now dynamic.
  const renderDonateWidget = () => (
    <>
      {/* Amount card — static display OR inline input when Other is selected.
          The whole card is the tap target so the keyboard opens from anywhere
          on it, not just the thin cursor line. */}
      <Pressable
        style={({ pressed }) => [styles.amountCard, pressed && styles.amountCardPressed]}
        onPress={handleAmountPress}
        accessibilityRole="button"
        accessibilityLabel={STRINGS.SEVA_OTHER}
      >
        <View style={styles.amountContainer}>
          <View style={styles.amountRow}>
            {/* The figure is ONE inline Text: the currency symbol (its own font —
                system for ₹, Baloo for the rest), the digits (always Baloo), a
                blinking cursor while editing, and the inline "/month" — all as
                spans, so they share ONE text baseline and always align, whatever
                the symbol's font. In "Other" mode the digits come from state fed
                by a hidden TextInput (below) that captures the keystrokes. */}
            <CustomText
              style={[
                styles.amountDisplay,
                { fontSize: amountFontSize, lineHeight: amountLineHeight },
              ]}
              numberOfLines={1}
            >
              {/* letterSpacing adds a few px of trailing space → a small gap
                  between the symbol and the amount. */}
              <Text
                style={{
                  fontFamily: symbolFontFamily,
                  fontSize: symbolFontSize,
                  letterSpacing: 8,
                }}
              >
                {currency.symbol}
              </Text>
              {isOtherSelected && customAmount === "" ? (
                <Text style={styles.amountPlaceholder}>0</Text>
              ) : (
                displayAmount
              )}
              {isOtherSelected && (
                <BlinkingCursor color={c.textPrimary} fontSize={amountFontSize} />
              )}
              {frequency !== "One Time" && (
                <Text style={styles.perMonthSpan}>{` /${getFrequencyLabel()}`}</Text>
              )}
            </CustomText>
            {isOtherSelected && (
              <TextInput
                ref={otherAmountInputRef}
                style={styles.hiddenInput}
                value={customAmount}
                onChangeText={handleCustomAmountChange}
                keyboardType="numeric"
                caretHidden
              />
            )}
          </View>
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
              numberOfLines={2}
            >
              {/* Symbol span (own font) + Baloo digits — inline, baseline-aligned.
                  `amount` is already the LOCAL figure. */}
              <Text style={{ fontFamily: symbolFontFamily }}>{currency.symbol}</Text>
              {formatNumber(amount)}
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
            numberOfLines={2}
          >
            {STRINGS.SEVA_OTHER}
          </CustomText>
        </Pressable>
      </View>

      {/* Frequency / donation type — one segmented control, not two loose
          radios. Announced as a radio group so a screen reader reads it as the
          single either-or choice it is, and each half states whether it is the
          chosen one; before this neither carried a role at all. */}
      <View style={styles.frequencyContainer} accessibilityRole="radiogroup">
        {["Monthly", "One Time"].map((freq, index) => {
          const selected = frequency === freq;
          return (
            <React.Fragment key={freq}>
              {index > 0 && <View style={styles.frequencyDivider} />}
              <Pressable
                style={({ pressed }) => [
                  styles.frequencyOption,
                  pressed && styles.frequencyOptionPressed,
                ]}
                onPress={() => handleFrequencyChange(freq)}
                accessibilityRole="radio"
                accessibilityState={{ selected, checked: selected }}
                accessibilityLabel={FREQUENCY_LABELS[freq]}
              >
                <View
                  style={[styles.radioRing, selected ? styles.radioRingOn : styles.radioRingOff]}
                >
                  {selected && <View style={styles.radioDot} />}
                </View>
                <CustomText style={[styles.frequencyText, selected && styles.frequencyTextOn]}>
                  {FREQUENCY_LABELS[freq]}
                </CustomText>
              </Pressable>
            </React.Fragment>
          );
        })}
      </View>

      {/* Donate button */}
      <Pressable style={styles.donateButton} onPress={handleDonate}>
        <LinearGradient
          colors={[c.controlAccent, c.controlAccentPressed]}
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
          <DonateIcon size={30} color={c.onControlAccent} />
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

  const renderSlot = (name, key) => {
    if (name === "donate_widget") {
      return <React.Fragment key={key}>{renderDonateWidget()}</React.Fragment>;
    }
    if (name === "tax_note") return <React.Fragment key={key}>{renderTaxNote()}</React.Fragment>;
    return null;
  };

  // The "donate" card group: a bordered card with an icon header built from the
  // server card-title/card-sub, then the native donate widget + tax note the
  // group contains (positioned by the backend via slots).
  const renderDonateCard = (childSegments, key) => {
    let cardTitle = "";
    let cardSub = "";
    const slots = [];
    childSegments.forEach((seg) => {
      if (seg.type === "html") {
        parseHtmlBlocks(seg.value).forEach((block) => {
          const cls = block.className || "";
          if (cls.includes("seva-card-title")) cardTitle = blockText(block);
          else if (cls.includes("seva-card-sub")) cardSub = blockText(block);
        });
      } else if (seg.type === "slot") {
        slots.push(seg.name);
      }
    });
    return (
      <View key={key} style={styles.donateCard}>
        {/* Card header (icon + title/sub) renders only when the server content
            actually provides a title or subtitle. When both are dropped, the
            card starts straight at the donate widget — no lone floating icon. */}
        {(!!cardTitle || !!cardSub) && (
          <View style={styles.donateCardHeader}>
            <View style={styles.cardIconCircle}>
              <HandHeartIcon size={22} color={c.accent} />
            </View>
            <View style={styles.donateCardHeaderText}>
              {!!cardTitle && <CustomText style={styles.cardTitle}>{cardTitle}</CustomText>}
              {!!cardSub && <CustomText style={styles.cardSub}>{cardSub}</CustomText>}
            </View>
          </View>
        )}
        {slots.map((name, idx) => renderSlot(name, `${key}-slot-${idx}`))}
      </View>
    );
  };

  // Renders the full server-driven segment list as the flat page layout,
  // grouping <!--CARD:...-->…<!--/CARD--> into a card. Server + bundled default
  // are effectively never empty, so the empty case is only a safety net.
  const renderSegments = () => {
    if (!segments.length) {
      return (
        <View style={styles.donateCard}>
          {renderDonateWidget()}
          {renderTaxNote()}
        </View>
      );
    }
    const out = [];
    let i = 0;
    while (i < segments.length) {
      const seg = segments[i];
      if (seg.type === "card_open") {
        const children = [];
        i += 1;
        while (i < segments.length && segments[i].type !== "card_close") {
          children.push(segments[i]);
          i += 1;
        }
        if (i < segments.length) i += 1; // skip card_close
        out.push(renderDonateCard(children, `card-${out.length}`));
      } else if (seg.type === "html") {
        out.push(
          <React.Fragment key={`seg-${i}`}>
            {renderHtmlSegment(seg.value, `seg-${i}`)}
          </React.Fragment>
        );
        i += 1;
      } else if (seg.type === "slot") {
        out.push(renderSlot(seg.name, `seg-${i}`));
        i += 1;
      } else {
        i += 1; // stray card_close → skip
      }
    }
    return out;
  };

  // Regular app bar (SIO-155): plain title + a close (✕) button top-right that
  // returns to Home / All Banis. Replaces the old in-page "ਸੁੰਦਰ ਗੁਟਕਾ" heading.
  // The bar background matches the page BODY (dark navy / cream) so there's no
  // contrasting black strip above the divider.
  // Matches the dashboard's ground rather than the old cream. The foreground
  // drives BOTH the "Seva" title and the close cross: near-black read as a
  // heavy, unbranded mark against the light bar, so it is the brand navy.
  const headerBg = c.backgroundAlt;
  // The one header foreground — brand navy in light, white in dark. Drives both
  // the "Seva" title and the close cross. `textPrimary`'s near-black read as a
  // heavy, unbranded mark against the light bar.
  const { headerFg } = c;
  // The shared header, like every other screen. This used to be `AppBar`, a
  // second header component that duplicated ScreenHeader and drifted from it —
  // it padded by the raw safe-area inset and stood its row at 52 instead of 56,
  // so the Seva title and the divider under it sat lower than everywhere else.
  //
  // The title size comes from the `title` type role rather than a hand-set 26.
  const renderHeader = () => (
    <ScreenHeader
      title={STRINGS.SEVA}
      surface={headerBg}
      titleVariant="title"
      showBorder={false}
      actions={
        <Pressable
          onPress={() => navigation.navigate("Home")}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={STRINGS.CLOSE}
        >
          {/* Same size as the Dashboard's close cross, so the two read as one
              control rather than two. */}
          <CloseIcon size={theme.layout.header.closeIconSize} color={headerFg} />
        </Pressable>
      }
    />
  );

  // ─── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeArea backgroundColor={headerBg}>
        <StatusBarComponent backgroundColor={headerBg} />
        {renderHeader()}
        <GradientDivider />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.c.accent} />
        </View>
      </SafeArea>
    );
  }

  // ─── Error / offline ──────────────────────────────────────────────────────
  if (error) {
    return (
      <SafeArea backgroundColor={headerBg}>
        <StatusBarComponent backgroundColor={headerBg} />
        {renderHeader()}
        <GradientDivider />
        <View style={styles.centered}>
          <CustomText style={styles.description}>{STRINGS.SEVA_LOAD_ERROR}</CustomText>
          <Pressable onPress={() => Linking.openURL("https://khalisfoundation.org/donate")}>
            <CustomText style={[styles.description, { color: theme.c.textBrand }]}>
              {STRINGS.SEVA_DONATE_DIRECTLY}
            </CustomText>
          </Pressable>
        </View>
      </SafeArea>
    );
  }

  // ─── Main screen ──────────────────────────────────────────────────────────
  return (
    <SafeArea backgroundColor={headerBg}>
      <StatusBarComponent backgroundColor={headerBg} />
      {renderHeader()}
      <GradientDivider />
      {/* The app's themed scrollbar, the same one the bani list and Settings
          draw — the native bar cannot follow a designed theme. Indicator is a
          SIBLING inside a flex:1 wrapper, as the hook requires. */}
      <View style={{ flex: 1 }}>
        <Animated.ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          // eslint-disable-next-line react/jsx-props-no-spreading
          {...scrollViewProps}
        >
          <View
            style={[
              styles.container,
              {
                paddingHorizontal: hPad,
                // Tighter top padding — the AppBar + divider already separate
                // the hero from the top, so the hero ("Support our mission")
                // sits close.
                paddingTop: Math.round(vPad * 0.4),
                paddingBottom: vPad,
                gap,
              },
            ]}
          >
            {renderSegments()}
          </View>
        </Animated.ScrollView>
        {Indicator}
      </View>
    </SafeArea>
  );
};

SevaScreen.propTypes = {
  // Only the one method this screen calls; PropTypes.object is forbidden and
  // describes nothing anyway.
  navigation: PropTypes.shape({ navigate: PropTypes.func }),
};

export default SevaScreen;
