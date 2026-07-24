/* eslint-env jest */
import { buildBundledSevaLayout, buildBundledMeansPage } from "./sevaBundledContent";

describe("sevaBundledContent — offline mirror of the backend layout", () => {
  describe("buildBundledSevaLayout (main Seva page)", () => {
    it("links Khalis Foundation, Sundar Gutka and SikhiToTheMax in the hero description", () => {
      const en = buildBundledSevaLayout("en");
      // Khalis Foundation is its own link to the org site (added 2026-07-24),
      // mirroring the backend's seva-content.ts.
      expect(en).toContain('<a href="https://khalisfoundation.org/">Khalis Foundation</a>');
      expect(en).toContain('<a href="https://khalisfoundation.org/">Sundar Gutka</a>');
      expect(en).toContain('<a href="https://www.sikhitothemax.org/">SikhiToTheMax</a>');
    });

    it("keeps the org name in each language's own script as the link label", () => {
      const pa = buildBundledSevaLayout("pa");
      expect(pa).toContain('<a href="https://khalisfoundation.org/">ਖਾਲਿਸ ਫਾਊਂਡੇਸ਼ਨ</a>');
      const fr = buildBundledSevaLayout("fr");
      // French keeps the article "La " outside the link.
      expect(fr).toContain('La <a href="https://khalisfoundation.org/">Khalis Foundation</a>');
    });

    it("leaves no unreplaced placeholder tokens in any language", () => {
      ["en", "hi", "pa", "fr", "it", "es"].forEach((lang) => {
        const html = buildBundledSevaLayout(lang);
        expect(html).not.toContain("{kf}");
        expect(html).not.toContain("{sg}");
        expect(html).not.toContain("{sttm}");
      });
    });

    it("still emits the hero, donate card slots and the four means rows", () => {
      const en = buildBundledSevaLayout("en");
      expect(en).toContain('class="seva-hero-title"');
      expect(en).toContain("<!--SLOT:donate_widget-->");
      expect(en).toContain("<!--SLOT:tax_note-->");
      ["social", "coding", "qa", "other"].forEach((page) =>
        expect(en).toContain(`href="seva-means:${page}"`)
      );
    });
  });

  describe("buildBundledMeansPage (sub-pages)", () => {
    it("returns a titled, footer-terminated fragment for a known page", () => {
      const page = buildBundledMeansPage("seva-by-coding", "en");
      expect(page.title).toBe("Seva for Coders");
      expect(page.content).toContain('class="seva-footer"');
      expect(page.content).toContain('href="https://github.com/KhalisFoundation/sundar-gutka-react"');
    });

    it("returns null for an unknown page key", () => {
      expect(buildBundledMeansPage("seva-by-nope", "en")).toBeNull();
    });

    it("Other-opportunities page is a plain intro + link, matching the other three pages (regression)", () => {
      // Regression: the page model here previously still pointed at a
      // "hero"/"other_soon" section that had been deleted from the
      // translation dict when the backend restyled this page — leaving raw,
      // untranslated key names ("other_soon") rendered as visible text for a
      // brand-new offline user. No `class="seva-hero-title"` should exist on
      // this page anymore, and no dictionary key should ever leak as text.
      ["en", "hi", "pa", "fr", "it", "es"].forEach((lang) => {
        const page = buildBundledMeansPage("seva-by-other", lang);
        expect(page.content).toContain('class="seva-intro"');
        expect(page.content).not.toContain('class="seva-hero-title"');
        expect(page.content).not.toContain("other_soon");
        expect(page.content).toContain('class="seva-footer"');
      });
    });
  });
});
