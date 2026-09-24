import { Hono } from "hono";
import type { AppEnv } from "../../env";

// プレースホルダのまま gtag を読まない判定はクライアント側。
// ここは設定値を返すだけにして、計測 ID の置き場所を wrangler vars に一本化する。
const GA_MEASUREMENT_ID_PLACEHOLDER = "G-XXXXXXXXXX";

export const publicConfigRoute = new Hono<AppEnv>().get("/", (c) => {
  const configured = c.env.GA_MEASUREMENT_ID;
  const gaMeasurementId =
    typeof configured === "string" && configured.length > 0
      ? configured
      : GA_MEASUREMENT_ID_PLACEHOLDER;
  return c.json({ gaMeasurementId });
});
