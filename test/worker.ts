// テスト用 Worker エントリ: 本番（workers/app.ts）と同じ /api マウント構成にする。
// 静的アセットの配信は vitest では検証しないため、ここでは API のみ。
import { Hono } from "hono";
import { api } from "../server/api";
import type { AppEnv } from "../server/env";

const app = new Hono<AppEnv>();
app.route("/api", api);

export default app;
