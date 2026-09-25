import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import type { AppEnv } from "../../env";
import { logger } from "../../logger";

// 検証前に正規化（トリム + 小文字化）して、表記揺れによる重複登録を防ぐ
const waitlistSchema = z.object({
  email: z.preprocess(
    (value) => (typeof value === "string" ? value.trim().toLowerCase() : value),
    z.email().max(254),
  ),
  // 質問の選択値をまとめた任意メモ。空文字は未指定と同じにする。
  note: z.preprocess((value) => {
    if (value === undefined || value === null) return undefined;
    if (typeof value !== "string") return value;
    const trimmed = value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim();
    return trimmed.length === 0 ? undefined : trimmed;
  }, z.string().max(2000).optional()),
});

function missingNoteColumn(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /no column named note|no such column: note/i.test(message);
}

async function insertSignup(
  db: AppEnv["Bindings"]["DB"],
  email: string,
  note: string | undefined,
): Promise<boolean> {
  if (note !== undefined) {
    try {
      const result = await db
        .prepare("INSERT OR IGNORE INTO waitlist (email, note) VALUES (?, ?)")
        .bind(email, note)
        .run();
      return (result.meta.changes ?? 0) > 0;
    } catch (error) {
      if (!missingNoteColumn(error)) throw error;
      // リモートマイグレーション前でもメール登録自体は続ける
      logger.warn("waitlist note column missing; stored email only");
    }
  }

  const result = await db
    .prepare("INSERT OR IGNORE INTO waitlist (email) VALUES (?)")
    .bind(email)
    .run();
  return (result.meta.changes ?? 0) > 0;
}

export const waitlistRoute = new Hono<AppEnv>().post(
  "/",
  zValidator("json", waitlistSchema),
  async (c) => {
    const { email, note } = c.req.valid("json");
    const created = await insertSignup(c.env.DB, email, note);
    return c.json({ registered: true, created }, created ? 201 : 200);
  },
);
