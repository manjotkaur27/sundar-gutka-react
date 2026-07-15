import { Platform } from "react-native";

const script = (theme) => {
  const listener = Platform.OS === "android" ? "document" : "window";
  const body = Platform.OS === "android" ? "document.body" : "window.document.body";
  return `

let autoScrollTimeout;
let autoScrollRAF = null;
let autoScrollSpeed = 0;
let scrollMultiplier = 1.5;
let isScrolling;
let isManuallyScrolling = false;
let lastHighlightedElement = null;
let highlightTimeout = null;
let hasReachedEnd = false;
let accumulatedScroll = 0;
let lastFrameTime = 0;

const clearAllHighlights = () => {
  if (highlightTimeout != null) {
    clearTimeout(highlightTimeout);
    highlightTimeout = null;
  }
  if (lastHighlightedElement) {
    lastHighlightedElement.style.backgroundColor = lastHighlightedElement.dataset.origBg || '';
    lastHighlightedElement.style.width = lastHighlightedElement.dataset.origWidth || '';
    lastHighlightedElement.style.margin = lastHighlightedElement.dataset.origMargin || '';
    lastHighlightedElement.style.borderRadius = '';
    lastHighlightedElement = null;
  }
};

const clearScrollTimeout=()=> {
  if (autoScrollTimeout != null) {
    clearTimeout(autoScrollTimeout);
  }
  autoScrollTimeout = null;
  if (autoScrollRAF != null) {
    cancelAnimationFrame(autoScrollRAF);
    autoScrollRAF = null;
  }
}

let lastScrollFuncTime = 0;
// Tap-vs-scroll bookkeeping: any scroll event during a touch (or momentum that
// is still settling when a new touch lands) disqualifies that touch from being
// treated as a tap.
let scrolledDuringTouch = false;
let lastScrollTime = 0;
// Throttle the expensive topmost-element scan on manual scroll. Reading the bar
// direction is cheap and runs every tick (so the bars stay responsive), but
// scanning every text-item with getBoundingClientRect is far too heavy to run
// 60x/sec on low-end devices — 150ms position-save granularity is plenty.
let lastElementIdTime = 0;
const ELEMENT_ID_THROTTLE = 150;
// Programmatic-scroll guard: audio sync-scroll, seek, position-restore and
// bookmark jumps all call scrollIntoView, which fires the same scroll events a
// user swipe does. Without this window those scrolls would be read as a swipe
// direction and flicker the bars — e.g. seeking back/forth toggles them. We stamp
// a short window whenever we scroll the page ourselves and skip direction
// detection until it elapses (each new programmatic scroll re-arms it).
let programmaticScrollUntil = 0;
const PROGRAMMATIC_SCROLL_WINDOW = 600;

const scrollFunc=(e)=> {
  // Tap-detection bookkeeping — user scrolls only. While auto-scroll runs it
  // drives the page itself every frame; if those frames stamped lastScrollTime,
  // the touchend guard (now - lastScrollTime > 200) would treat every tap as
  // "tapping a moving page" and refuse to toggle the bars. Gating on
  // autoScrollSpeed keeps that guard working for real fling momentum (auto-scroll
  // off) while letting a tap toggle the bars during auto-scroll.
  if (autoScrollSpeed == 0) {
    scrolledDuringTouch = true;
    lastScrollTime = Date.now();
  }

  // ── Bar direction detection — FIRST, before any expensive DOM work ──────
  // Scroll direction drives the bars: scrolling down hides them, scrolling up
  // shows them (a tap toggles — see the touch handlers below). This runs on
  // every scroll tick so the bars react the instant the user changes direction,
  // even on slow devices where the element scan further down is costly. The bars
  // are an RN overlay that no longer resizes the WebView, so a toggle can never
  // feed a spurious scroll back into here — no cooldown is needed.
  if (typeof scrollFunc.y == "undefined") {
    scrollFunc.y = window.pageYOffset;
  }
  if (autoScrollSpeed == 0) {
    const currentY = window.pageYOffset;
    const diffY = scrollFunc.y - currentY; // > 0 scrolling up, < 0 scrolling down
    // The anchor (scrollFunc.y) only advances once a direction commits, so slow
    // scrolls keep accumulating past the threshold instead of the reference
    // resetting on every event and swallowing the movement.
    if (Date.now() < programmaticScrollUntil) {
      // A programmatic scroll (audio sync / seek / restore / bookmark) is still
      // settling — keep the anchor in sync but don't toggle. Otherwise seeking
      // back/forth reads as a swipe and flickers the bars.
      scrollFunc.y = currentY;
    } else if (diffY < -3) {
      window.ReactNativeWebView.postMessage("hide");
      scrollFunc.y = currentY;
    } else if (diffY > 3) {
      window.ReactNativeWebView.postMessage("show");
      scrollFunc.y = currentY;
    }
  } else {
    // Auto-scrolling: keep the anchor pinned to the live position so the first
    // manual scroll afterwards is measured from where the reader actually is.
    scrollFunc.y = window.pageYOffset;
  }

  // During auto-scroll, throttle the remaining (expensive) work to every 300ms
  // to prevent the 60fps RAF from triggering 60 DOM queries/sec.
  if (autoScrollSpeed > 0) {
    const now = Date.now();
    if (now - lastScrollFuncTime < 300) return;
    lastScrollFuncTime = now;
  }

  // ── Scroll progress — cheap arithmetic, posted every tick for a smooth bar ──
  var sh = document.documentElement.scrollHeight;
  var ch = window.innerHeight;
  var maxScroll = sh - ch;
  if (maxScroll > 0) {
    var pct = (window.scrollY || window.pageYOffset) / maxScroll;
    if (pct < 0) pct = 0;
    if (pct > 1) pct = 1;
    window.ReactNativeWebView.postMessage("scroll-progress-" + pct.toFixed(4));
  }

  // ── Topmost element (position save) — heavy DOM scan, throttled on manual
  // scroll so it stays off the hot path on low-end devices. ────────────────
  if (autoScrollSpeed == 0) {
    const nowId = Date.now();
    if (nowId - lastElementIdTime < ELEMENT_ID_THROTTLE) return;
    lastElementIdTime = nowId;
  }

  // Check if user has reached the end of the document
  const scrollHeight = document.documentElement.scrollHeight;
  const scrollTop = window.scrollY || window.pageYOffset;
  const clientHeight = window.innerHeight;
  const threshold = 50; // pixels from bottom to consider "at end"
  const isAtEnd = scrollTop + clientHeight >= scrollHeight - threshold;

  if (isAtEnd && !hasReachedEnd) {
    hasReachedEnd = true;
  } else if (!isAtEnd && hasReachedEnd) {
    // Reset flag when user scrolls away from the end
    hasReachedEnd = false;
  }

  // Report topmost element on both manual and auto-scroll so read context
  // survives background/terminate mid-auto-scroll.
  const elementId = getTopmostElementId();
  if (elementId && !hasReachedEnd) {
    const topEl = document.getElementById(String(elementId));
    const seq = topEl ? (topEl.getAttribute("data-sequence") || "") : "";
    window.ReactNativeWebView.postMessage("scroll-elementId-" + elementId + "|seq-" + seq);
  } else if (hasReachedEnd) {
    window.ReactNativeWebView.postMessage("scroll-elementId-null");
  }
}

const getTopmostElementId=()=> {
  const viewportTop = window.pageYOffset;
  const viewportBottom = viewportTop + window.innerHeight;
  const viewportCenter = viewportTop + (window.innerHeight / 2);
  
  // Get all text items
  const textItems = document.querySelectorAll('.text-item[id]');
  
  let topmostElement = null;
  let minDistance = Infinity;
  
  // Find the element closest to the top of the viewport
  for (let i = 0; i < textItems.length; i++) {
    const element = textItems[i];
    const rect = element.getBoundingClientRect();
    const elementTop = rect.top + window.pageYOffset;
    const elementBottom = elementTop + rect.height;
    
    // Check if element is visible in viewport
    if (elementBottom >= viewportTop && elementTop <= viewportBottom) {
      // Calculate distance from viewport top
      const distance = Math.abs(elementTop - viewportTop);
      if (distance < minDistance) {
        minDistance = distance;
        topmostElement = element;
      }
    }
  }
  
  // If no element found in viewport, find the closest element above viewport
  if (!topmostElement) {
    for (let i = textItems.length - 1; i >= 0; i--) {
      const element = textItems[i];
      const rect = element.getBoundingClientRect();
      const elementTop = rect.top + window.pageYOffset;
      
      if (elementTop < viewportCenter) {
        topmostElement = element;
        break;
      }
    }
  }
  
  // Fallback: if still no element, use first element
  if (!topmostElement && textItems.length > 0) {
    topmostElement = textItems[0];
  }
  
  return topmostElement ? topmostElement.id : null;
}

const fadeInEffect = () => {
  let fadeTarget = ${body};
  fadeTarget.style.opacity = 0;
  let fadeVal = 0;
  let fadeEffect = setInterval(() => {
    if (fadeVal < 1) {
      fadeVal = Number(fadeVal) + 0.1;
      fadeTarget.style.opacity = fadeVal;
    } else {
      fadeTarget.style.opacity = 1;
      clearInterval(fadeEffect);
    }
  }, 100);
};
const setAutoScroll=()=> {
  // Cancel any existing animation
  clearScrollTimeout();

  if (autoScrollSpeed <= 0) return;

  lastFrameTime = performance.now();
  accumulatedScroll = 0;

  const scrollStep = (currentTime) => {
    if (autoScrollSpeed <= 0) {
      autoScrollRAF = null;
      return;
    }

    // Stop at bottom
    const scrollHeight = document.documentElement.scrollHeight;
    const scrollTop = window.scrollY || window.pageYOffset;
    const clientHeight = window.innerHeight;
    if (scrollTop + clientHeight >= scrollHeight - 2) {
      autoScrollRAF = null;
      return;
    }

    if (!isManuallyScrolling) {
      // Compute from live autoScrollSpeed so speed changes take effect immediately
      // Speed reduced by 50% per user request (was 1.1, now 0.55)
      const pxPerSecond = autoScrollSpeed * 0.55 * scrollMultiplier;
      const deltaMs = currentTime - lastFrameTime;
      // Cap delta to prevent huge jumps after tab switch
      const deltaSec = Math.min(deltaMs / 1000, 0.05);
      accumulatedScroll += pxPerSecond * deltaSec;

      if (accumulatedScroll >= 0.5) {
        const px = accumulatedScroll;
        window.scrollBy(0, px);
        accumulatedScroll = 0;
      }
    }

    lastFrameTime = currentTime;
    autoScrollRAF = requestAnimationFrame(scrollStep);
  };

  autoScrollRAF = requestAnimationFrame(scrollStep);
}

window.addEventListener(
  "orientationchange",
   ()=> {
    setTimeout(()=> {
      const elementId = getTopmostElementId();
      if (elementId) {
        const element = document.getElementById(String(elementId));
        if (element) {
          programmaticScrollUntil = Date.now() + PROGRAMMATIC_SCROLL_WINDOW;
          element.scrollIntoView({
            behavior: "smooth",
            block: "start",
            inline: "nearest"
          });
        }
      }
    }, 50);
  },
  false
);

${listener}.onload = () => {
  if (${theme.mode === "dark"}) {
  //fade event
fadeInEffect();
}
}


//  Listen for scroll events
${listener}.addEventListener(
  "scroll",
  (event)=> {
    // Clear our timeout throughout the scroll
    window.clearTimeout(isScrolling);
    // Set a timeout to run after scrolling ends
    isScrolling = setTimeout( ()=> {
      isManuallyScrolling = false;
    }, 300);
  },
  false
);



${listener}.onscroll = scrollFunc;
// Touch events for auto-scroll handling + tap detection.
let wasAutoScrolling = false;
// Tap detection: a touch that ends without meaningful movement is a tap and
// toggles the bars. A touch that moves (a scroll) never toggles — scrolling
// only hides (see scrollFunc). This keeps scroll gestures from flipping the
// bars, while a genuine tap still shows or hides them.
let tapStartX = 0;
let tapStartY = 0;
let tapStartTime = 0;
let tapMoved = false;
const TAP_MOVE_THRESHOLD = 10; // px
const resumeAutoScroll = () => {
  isManuallyScrolling = false;
  // Resume auto-scroll if it was active before touch
  if (wasAutoScrolling && autoScrollSpeed !== 0 && autoScrollRAF == null) {
    wasAutoScrolling = false;
    setAutoScroll();
  }
};
${listener}.addEventListener("touchstart", (e)=> {
  if (autoScrollSpeed !== 0) {
    wasAutoScrolling = true;
    clearScrollTimeout();
  }
  // Signal user activity so RN can restart its inactivity auto-hide countdown for
  // the bars. RN only acts on it while auto-scroll or audio is active; harmless
  // otherwise.
  window.ReactNativeWebView.postMessage("activity");
  tapMoved = false;
  scrolledDuringTouch = false;
  tapStartTime = Date.now();
  if (e.touches && e.touches.length > 0) {
    tapStartX = e.touches[0].clientX;
    tapStartY = e.touches[0].clientY;
  }
});
${listener}.addEventListener("touchmove", (e)=> {
  isManuallyScrolling = true;
  if (!tapMoved && e.touches && e.touches.length > 0) {
    const dx = Math.abs(e.touches[0].clientX - tapStartX);
    const dy = Math.abs(e.touches[0].clientY - tapStartY);
    if (dx > TAP_MOVE_THRESHOLD || dy > TAP_MOVE_THRESHOLD) {
      tapMoved = true;
    }
  }
});
${listener}.addEventListener("touchend", ()=> {
  // A tap toggles the bars. It must be: quick, without finger movement, with no
  // scroll event during the touch, and not landing on still-settling momentum
  // (a tap-to-stop-scroll gesture). Any of these means it was a scroll, not a tap.
  const now = Date.now();
  const isTap =
    !tapMoved &&
    !scrolledDuringTouch &&
    (now - tapStartTime) < 300 &&
    (now - lastScrollTime) > 200;
  if (isTap) {
    window.ReactNativeWebView.postMessage("toggle");
  }
  resumeAutoScroll();
});
${listener}.addEventListener("touchcancel", resumeAutoScroll);

${listener}.addEventListener(
  "message",
  (event)=> {
    const message = JSON.parse(event.data);

    if (message.hasOwnProperty("bookmark")) {
      const element = document.getElementById(String(message.bookmark));
      if(!element){
        return;
      }
        // Manually scroll to the bookmarked element because location.hash is unreliable inside WebView HTML
      programmaticScrollUntil = Date.now() + PROGRAMMATIC_SCROLL_WINDOW;
      element.scrollIntoView({
        behavior: "smooth",
        block: "start",
        inline: "nearest"
      });
      const sequenceStringNormal=element.getAttribute("data-sequence");
      const sequenceStringParagraph=element.getAttribute("data-sequences");
      const sequenceString = sequenceStringNormal ? sequenceStringNormal : sequenceStringParagraph;
      window.ReactNativeWebView.postMessage("sequenceString-" + sequenceString);
      window.ReactNativeWebView.postMessage("hide");
    }
    if (message.hasOwnProperty("resetHighlight")) {
      clearAllHighlights();
    }
    if (message.hasOwnProperty("freezeHighlight")) {
      if (highlightTimeout != null) {
        clearTimeout(highlightTimeout);
        highlightTimeout = null;
      }
    }
    if (message.hasOwnProperty("autoScroll")) {
      autoScrollSpeed = message.autoScroll;
      scrollMultiplier = message.scrollMultiplier;
      if (autoScrollRAF == null) {
        setAutoScroll();
      }
    }
      // Handle scroll to saved element or position
    if (message.hasOwnProperty("action") && message.action === "scrollToPosition") {
      let element = null;
      if (message.elementId) {
        element = document.getElementById(String(message.elementId));
      }
      // Fallback: locate by sequence so toggling paragraph mode mid-read
      // still restores position even though DOM ids changed.
      if (!element && message.sequence) {
        const seq = parseInt(message.sequence, 10);
        if (Number.isInteger(seq) && seq > 0) {
          element = document.querySelector('[data-sequences*="|' + seq + '|"]')
                 || document.querySelector('[data-sequence="' + seq + '"]');
        }
      }
      if (element) {
        programmaticScrollUntil = Date.now() + PROGRAMMATIC_SCROLL_WINDOW;
        element.scrollIntoView({
          behavior: "auto",
          block: "start",
          inline: "nearest"
        });
      }
      return;
    }
      // Handle sync scroll to sequence
    if (message.hasOwnProperty("action") && message.action === "scrollToSequence") {
      // Sanitize and validate sequence number
      const sequenceNumber = parseInt(message.sequence, 10);
      const isParagraphMode = message.isParagraphMode;
      const timeOut = message.timeout;
      
      // Validate that it's a valid positive integer
      if (!Number.isInteger(sequenceNumber) || sequenceNumber < 1) {
        return;
      }
      
      let element = null;
      
      if (isParagraphMode) {
        // Use CSS selector trick with pipe delimiters for instant match
        element = document.querySelector('[data-sequences*="|' + sequenceNumber + '|"]');
      } else {
        element = document.querySelector('[data-sequence="' + sequenceNumber + '"]');
      }
      
      if (element) {
        // Find the gurmukhi div within the element
        const gurmukhiDiv = element.querySelector('.gurmukhi') || element;
        
        // Check if this is the same element as last time
        const isSameElement = lastHighlightedElement === element;
        
        // Clear previous highlight timeout if exists
        if (highlightTimeout) {
          clearTimeout(highlightTimeout);
          highlightTimeout = null;
        }
        
        // Remove highlight from previous element if different
        if (lastHighlightedElement && !isSameElement) {
          lastHighlightedElement.style.backgroundColor = lastHighlightedElement.dataset.origBg || '';
          lastHighlightedElement.style.width = lastHighlightedElement.dataset.origWidth || '';
          lastHighlightedElement.style.margin = lastHighlightedElement.dataset.origMargin || '';
          lastHighlightedElement.style.transition = '';
        }
        
        // Only scroll if it's a different element
        if (!isSameElement) {
          const behavior = message.behavior === "smooth" ? "smooth" : "auto";
          programmaticScrollUntil = Date.now() + PROGRAMMATIC_SCROLL_WINDOW;
          gurmukhiDiv.scrollIntoView({
            behavior: behavior,
            block: "center",
            inline: "nearest"
          });
        }
        
        // Only snapshot original styles the first time this element is highlighted.
        // Re-highlighting the same element (e.g. multiple sequences in one paragraph)
        // must NOT overwrite origBg — it would capture the highlight colour and make
        // clearAllHighlights restore to the highlight colour instead of transparent.
        if (!isSameElement) {
          element.dataset.origBg = element.style.backgroundColor;
          element.dataset.origWidth = element.style.width;
          element.dataset.origMargin = element.style.margin;
        }
        const originalBackgroundColor = element.dataset.origBg || '';
        const originalWidth = element.dataset.origWidth || '';
        const originalMargin = element.dataset.origMargin || '';

        // Apply highlight
        element.style.backgroundColor = "${theme.staticColors.HIGHLIGHT_COLOR}";
        element.style.borderRadius = "15px";
        element.style.width = "fit-content";

        // Preserve alignment when using fit-content. The alignment class lives on
        // the inner gurmukhi div, not on the outer .text-item (element).
        if (gurmukhiDiv.classList.contains("center")) {
          element.style.margin = "0 auto";
        } else if (gurmukhiDiv.classList.contains("right")) {
          element.style.marginLeft = "auto";
          element.style.marginRight = "0";
        }

        // Store current element
        lastHighlightedElement = element;

        // Remove highlight after timeout
        highlightTimeout = setTimeout(()=> {
          element.style.backgroundColor = originalBackgroundColor;
          element.style.width = originalWidth;
          element.style.margin = originalMargin;
          highlightTimeout = null;
        }, timeOut);        
      }
    }
  },
  false
);
      `;
};
export default script;
