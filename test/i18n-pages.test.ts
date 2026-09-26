import { describe, expect, it } from "vitest";
import enHtml from "../public/index.html?raw";
import jaHtml from "../public/ja/index.html?raw";

// LP は EN / JA の 2 ファイル構成。両者でセクション構成とフォーム項目が揃っていることを
// 壊さないための回帰テスト（コピーだけが変わる、が前提）。
const ORIGIN = "https://realshibuya.polarissea.com";

function formFieldNames(html: string): string[] {
  return [...html.matchAll(/\sname="([a-z-]+)"/g)].map((m) => m[1]).sort();
}

function sectionIds(html: string): string[] {
  return [...html.matchAll(/<section[^>]*\sid="([a-z-]+)"/g)].map((m) => m[1]).sort();
}

describe("landing pages", () => {
  it("declares the right document language", () => {
    expect(enHtml).toContain('<html lang="en">');
    expect(jaHtml).toContain('<html lang="ja">');
  });

  it("carries the locked headline in each language", () => {
    expect(enHtml).toContain("The real Shibuya,");
    expect(enHtml).toContain("made for you.");
    expect(jaHtml).toContain("本物の渋谷を、");
    expect(jaHtml).toContain("あなた用に。");
  });

  it("points canonical at its own URL and cross-links the other language", () => {
    expect(enHtml).toContain(`<link rel="canonical" href="${ORIGIN}/" />`);
    expect(jaHtml).toContain(`<link rel="canonical" href="${ORIGIN}/ja/" />`);

    for (const html of [enHtml, jaHtml]) {
      expect(html).toContain(`hreflang="en" href="${ORIGIN}/"`);
      expect(html).toContain(`hreflang="ja" href="${ORIGIN}/ja/"`);
      expect(html).toContain(`hreflang="x-default" href="${ORIGIN}/"`);
    }
  });

  it("gives each language its own title, description and og:locale", () => {
    expect(enHtml).toContain('<meta property="og:locale" content="en_US" />');
    expect(jaHtml).toContain('<meta property="og:locale" content="ja_JP" />');
    expect(jaHtml).toContain("<title>Real Shibuya — 本物の渋谷を、あなた用に。</title>");
    expect(jaHtml).toMatch(/name="description"[\s\S]*?渋谷に住む人が/);
  });

  it("keeps the same sections and form fields on both pages", () => {
    expect(sectionIds(jaHtml)).toEqual(sectionIds(enHtml));
    expect(formFieldNames(jaHtml)).toEqual(formFieldNames(enHtml));
    expect(formFieldNames(enHtml)).toContain("email");
  });

  it("translates every form message, so main.js never needs locale strings", () => {
    const keys = ["sending", "created", "duplicate", "invalid", "network"];
    for (const html of [enHtml, jaHtml]) {
      for (const key of keys) {
        // plan フォームと offer B フォームの 2 箇所
        expect(html.match(new RegExp(`data-msg-${key}="[^"]+"`, "g"))).toHaveLength(2);
      }
    }
    // 英語文面が日本語ページに残っていないこと
    expect(jaHtml).not.toContain('data-msg-sending="Sending');
  });
});
