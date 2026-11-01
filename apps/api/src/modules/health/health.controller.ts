import { ApiResponse } from "../../lib/api-response";
import { asyncHandler } from "../../lib/async-handler";
import { HealthService } from "./health.service";
export abstract class HealthController {
  static live = asyncHandler(async (_req, res) => {
    ApiResponse.ok(
      res,
      { status: "ok", uptime: Math.round(process.uptime()) },
      "Alive",
    );
  });
  static ready = asyncHandler(async (_req, res) => {
    const report = await HealthService.check();
    const statusCode = report.status === "ok" ? 200 : 503;
    ApiResponse.send(
      res,
      statusCode,
      report,
      report.status === "ok" ? "Ready" : "Not ready",
    );
  });
}
