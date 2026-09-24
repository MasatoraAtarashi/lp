import { Hono } from "hono";
import type { AppEnv } from "../env";
import { errorHandler } from "../middleware/error-handler";
import { requestId } from "../middleware/request-id";
import { publicConfigRoute } from "./routes/public-config";
import { waitlistRoute } from "./routes/waitlist";

export const api = new Hono<AppEnv>()
  .use("*", requestId)
  .route("/waitlist", waitlistRoute)
  .route("/public-config", publicConfigRoute)
  .onError(errorHandler);
