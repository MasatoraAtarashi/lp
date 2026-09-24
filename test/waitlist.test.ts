import { exports } from "cloudflare:workers";
import { describe, expect, it } from "vitest";

async function post(email: unknown) {
  return exports.default.fetch("https://example.com/api/waitlist", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email }),
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
});
