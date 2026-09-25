import { env, exports } from "cloudflare:workers";
import { describe, expect, it } from "vitest";

async function post(email: unknown, note?: unknown) {
  const body = note === undefined ? { email } : { email, note };
  return exports.default.fetch("https://example.com/api/waitlist", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("waitlist API", () => {
  it("POST /api/waitlist でメールアドレスを登録できる", async () => {
    const res = await post("user@example.com");
    expect(res.status).toBe(201);
    const body = (await res.json()) as { registered: boolean; created: boolean };
    expect(body.registered).toBe(true);
    expect(body.created).toBe(true);
  });

  it("同じメールアドレスの再登録は重複として束ねる（200 + created: false）", async () => {
    const first = await post("dup@example.com");
    expect(first.status).toBe(201);

    const second = await post("dup@example.com");
    expect(second.status).toBe(200);
    const body = (await second.json()) as { registered: boolean; created: boolean };
    expect(body.registered).toBe(true);
    expect(body.created).toBe(false);
  });

  it("大文字・前後の空白は正規化して同一人物として扱う", async () => {
    const first = await post("Normalize@Example.com");
    expect(first.status).toBe(201);

    const second = await post("  normalize@example.com  ");
    expect(second.status).toBe(200);
  });

  it("不正なメールアドレスは 400 を返す（zod バリデーション）", async () => {
    expect((await post("not-an-email")).status).toBe(400);
    expect((await post("")).status).toBe(400);
  });

  it("email フィールドが欠けていれば 400 を返す", async () => {
    const res = await exports.default.fetch("https://example.com/api/waitlist", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });

  it("任意の note を同じ行に保存する", async () => {
    const note =
      "intent: free-plan\ndates: Flexible — within 2 weeks\npace: Easy — frequent pauses";
    const res = await post("notes@example.com", note);
    expect(res.status).toBe(201);

    const row = await env.DB.prepare("SELECT email, note FROM waitlist WHERE email = ?")
      .bind("notes@example.com")
      .first<{ email: string; note: string | null }>();
    expect(row?.email).toBe("notes@example.com");
    expect(row?.note).toBe(note);
  });

  it("空の note は保存せず、長すぎる note は 400 を返す", async () => {
    const created = await post("blank-note@example.com", "   ");
    expect(created.status).toBe(201);
    const row = await env.DB.prepare("SELECT note FROM waitlist WHERE email = ?")
      .bind("blank-note@example.com")
      .first<{ note: string | null }>();
    expect(row?.note).toBeNull();

    const tooLong = await post("long-note@example.com", "a".repeat(2001));
    expect(tooLong.status).toBe(400);
  });

  it("同じメールの再登録では最初の note を上書きしない", async () => {
    const first = await post("keep-note@example.com", "intent: free-plan");
    expect(first.status).toBe(201);

    const second = await post("keep-note@example.com", "intent: premium-waitlist");
    expect(second.status).toBe(200);

    const row = await env.DB.prepare("SELECT note FROM waitlist WHERE email = ?")
      .bind("keep-note@example.com")
      .first<{ note: string | null }>();
    expect(row?.note).toBe("intent: free-plan");
  });
});
