import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import type { AppEnv } from "../../env";

// 検証前に正規化（トリム + 小文字化）して、表記揺れによる重複登録を防ぐ
const waitlistSchema = z.object({
  email: z.preprocess(
    (value) => (typeof value === "string" ? value.trim().toLowerCase() : value),
    z.email().max(254),
  ),
});

export const waitlistRoute = new Hono<AppEnv>().post(
  "/",
  zValidator("json", waitlistSchema),
  async (c) => {
    const { email } = c.req.valid("json");
    // UNIQUE インデックスで重複を束ねる。既存登録時は INSERT が無視され changes = 0
    const result = await c.env.DB.prepare("INSERT OR IGNORE INTO waitlist (email) VALUES (?)")
      .bind(email)
      .run();
    const created = (result.meta.changes ?? 0) > 0;
    return c.json({ registered: true, created }, created ? 201 : 200);
  },
);
