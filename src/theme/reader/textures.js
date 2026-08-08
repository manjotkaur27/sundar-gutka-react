// Background textures, as inline SVG data URIs.
//
// Deliberately NOT bundled binary assets. A data URI:
//   • needs no @1x/@2x/@3x matrix, so iOS and Android cannot drift apart;
//   • sidesteps the Android release-build asset-resolution difference that makes
//     a require()d image load inside a WebView in debug but fail in release;
//   • costs a few hundred bytes instead of tens of kilobytes, which matters on
//     the low-end devices this app still supports;
//   • is resolution-independent — feTurbulence regenerates at any density.
//
// A theme's `background.image` may equally be a plain URL or a require()d asset;
// gutkahtml.js resolves whatever it is handed. These are simply what v1 ships.

const svgDataUri = (markup) => `data:image/svg+xml,${encodeURIComponent(markup.trim())}`;

// Fine fractal grain, fully desaturated — reads as laid-paper fibre when tiled
// at low opacity over a parchment ground.
export const PAPER_GRAIN = svgDataUri(`
<svg xmlns="http://www.w3.org/2000/svg" width="140" height="140">
  <filter id="g">
    <feTurbulence type="fractalNoise" baseFrequency="0.82" numOctaves="4" stitchTiles="stitch"/>
    <feColorMatrix type="saturate" values="0"/>
  </filter>
  <rect width="140" height="140" filter="url(#g)"/>
</svg>`);

export default { PAPER_GRAIN };
