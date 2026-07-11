import { Platform } from "react-native";
import { constant } from "@common";
import script from "./gutkaScript";

const getFontFaceURL = (fontFace) => {
  const fileUri = Platform.select({
    ios: `${fontFace}.ttf`,
    android: `file:///android_asset/fonts/${fontFace}.ttf`,
  });
  return fileUri;
};

const htmlTemplate = (backColor, fontFace, content, theme) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name='viewport' content='width=device-width, user-scalable=no'>
  <style>
    body {
      background-color: ${backColor};
      word-break: break-word;
      margin-top:50px;
    }
    ::-webkit-scrollbar {
      width: 4px;
      height: 4px;
      background: transparent;
    }
    ::-webkit-scrollbar-thumb {
      background: rgba(122, 153, 201, 0.5);
      border-radius: 4px;
    }
    ::-webkit-scrollbar-track {
      background: transparent;
    }
    @font-face {
      font-family: '${constant.GURBANI_AKHAR_TRUE}';
      src: url('${getFontFaceURL(constant.GURBANI_AKHAR_TRUE)}') format('truetype'),local('${
  constant.GURBANI_AKHAR_TRUE
}');
    }
    @font-face {
      font-family: '${constant.GURBANI_AKHAR_HEAVY_TRUE}';
      src: url('${getFontFaceURL(constant.GURBANI_AKHAR_HEAVY_TRUE)}') format('truetype'),local('${
  constant.GURBANI_AKHAR_HEAVY_TRUE
}');
    }
    @font-face {
      font-family: '${constant.GURBANI_AKHAR_THICK_TRUE}';
      src: url('${getFontFaceURL(constant.GURBANI_AKHAR_THICK_TRUE)}') format('truetype'),local('${
  constant.GURBANI_AKHAR_THICK_TRUE
}');
    }
    @font-face {
      font-family: '${constant.ANMOL_LIPI}';
      src: url('${getFontFaceURL(constant.ANMOL_LIPI)}') format('truetype'),local('${
  constant.ANMOL_LIPI
}');
    }
    @font-face {
      font-family: '${constant.BALOO_PAAJI}';
      src: url('${getFontFaceURL(constant.BALOO_PAAJI)}') format('truetype'),local('${
  constant.BALOO_PAAJI
}');
    }
    @font-face {
      font-family: '${constant.BALOO_PAAJI_SEMI_BOLD}';
      src: url('${getFontFaceURL(constant.BALOO_PAAJI_SEMI_BOLD)}') format('truetype'),local('${
  constant.BALOO_PAAJI_SEMI_BOLD
}');
    }

    .gurmukhi {
      padding: 0.2em;
      font-family: '${fontFace}', '${constant.GURBANI_AKHAR_HEAVY_TRUE}', '${
  constant.GURBANI_AKHAR_TRUE
}', '${constant.GURBANI_AKHAR_THICK_TRUE}', '${constant.ANMOL_LIPI}';
    }
    .transliteration, .translation {
      padding: 0.2em;
      font-family: '${constant.BALOO_PAAJI}';
    }
    * {
      -webkit-user-select: none;
    }
    .center{
      text-align:center
    }
    .left{
      text-align:left
    }
    .right{
      text-align:right
    }
  </style>
  <script>${script(theme)}</script>
</head>
<body>
  ${content}
  <script>
    // Must run here, AFTER the content div above is in the DOM — not in the
    // <head> script (gutkaScript.js), which executes before body content
    // exists and would always measure an empty page as "not scrollable".
    // A bani short enough to fit on one screen never fires a scroll event,
    // so scrollFunc's progress report never runs for it; without this such
    // a bani could never register as "read" under the scroll-percentage
    // completion rule. Report 100% once, whenever there's nothing to scroll.
    //
    // The measurement must wait until the Gurmukhi @font-face files have loaded
    // and the text has reflowed to its true height. Measuring synchronously at
    // parse time uses fallback (or zero-height) metrics, so a LONG bani like
    // Sukhmani Sahib momentarily fits on one screen and would falsely report
    // 100% on first open. Defer until fonts + layout settle, then re-measure.
    (function reportInitialScrollProgressIfNotScrollable() {
      function check() {
        var sh = document.documentElement.scrollHeight;
        var ch = window.innerHeight;
        // Exclude the artificial bottom inset (body padding-bottom, set by the
        // RN setBottomInset message to clear the nav/audio chrome) so a bani
        // whose real content fits on one screen still counts as non-scrollable
        // regardless of whether the inset was applied before or after this runs.
        var pb = parseFloat(getComputedStyle(document.body).paddingBottom) || 0;
        // Only auto-complete a genuinely rendered, non-scrollable bani. Without the
        // items>0 guard, the empty placeholder page (rendered while the shabad is
        // still loading — scrollHeight == innerHeight, no content) measures as
        // "not scrollable" and falsely reports 100%, auto-marking long banis read.
        var items = document.querySelectorAll(".text-item").length;
        if (items > 0 && sh - ch - pb <= 0) {
          window.ReactNativeWebView.postMessage("scroll-progress-1.0000");
        }
      }
      function checkAfterLayout() {
        // Two rAFs: let the post-font-load reflow paint before measuring.
        requestAnimationFrame(function () {
          requestAnimationFrame(check);
        });
      }
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(checkAfterLayout);
      } else if (document.readyState === "complete") {
        checkAfterLayout();
      } else {
        window.addEventListener("load", checkAfterLayout);
      }
    })();
  </script>
</body>
</html>
`;

export default htmlTemplate;
