import { Hono } from "hono";
import { api } from "../server/api";
import type { AppEnv } from "../server/env";

const app = new Hono<AppEnv>();

// API ルート（Hono）。静的アセット（public/）は Workers Static Assets が配信し、
// アセットにマッチしないリクエスト（/api/* など）だけがこの Worker に届く
app.route("/api", api);

export default app;
