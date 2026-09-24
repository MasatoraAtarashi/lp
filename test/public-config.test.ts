import { exports } from "cloudflare:workers";
import { describe, expect, it } from "vitest";

describe("public config", () => {
  it("GET /api/public-config は GA 計測 ID のプレースホルダを返す", async () => {
    const res = await exports.default.fetch("https://example.com/api/public-config");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { gaMeasurementId: string };
    expect(body.gaMeasurementId).toBe("G-XXXXXXXXXX");
  });
});
