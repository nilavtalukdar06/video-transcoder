import { ApiError } from "../../lib/api-error";
import { ApiResponse } from "../../lib/api-response";
import { asyncHandler } from "../../lib/async-handler";
import type { LogsParams, LogsQuery } from "./logs.schema";
import { LogsService } from "./logs.service";
export abstract class LogsController {
  static getVideoLogs = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    if (!userId) {
      throw ApiError.unauthorized("Authentication required");
    }
    const { videoId } = req.params as unknown as LogsParams;
    const page = await LogsService.getVideoLogs(
      userId,
      videoId,
      req.query as unknown as LogsQuery,
    );
    ApiResponse.ok(res, page, "Logs fetched");
  });
}
