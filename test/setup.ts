import { beforeAll } from "vitest";
import { env } from "cloudflare:workers";

// migrations/*.sql を読み込み順に適用して、テスト用 D1 をマイグレーション済み状態にする
const migrations = import.meta.glob("../migrations/*.sql", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

beforeAll(async () => {
  const files = Object.keys(migrations).sort();
  const statements = files
    .flatMap((file) => migrations[file].split("--> statement-breakpoint"))
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0);

  if (statements.length > 0) {
    await env.DB.batch(statements.map((statement) => env.DB.prepare(statement)));
  }
  // テスト間の干渉を防ぐため、データを空にしてから始める
  await env.DB.exec("DELETE FROM waitlist;");
});
