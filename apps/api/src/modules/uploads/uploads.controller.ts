import { ApiError } from "../../lib/api-error";
import { ApiResponse } from "../../lib/api-response";
import { asyncHandler } from "../../lib/async-handler";
import { UploadsService } from "./uploads.service";
export abstract class UploadsController {
  static presignVideo = asyncHandler(async (req, res) => {
    const userId = req.session.userId;
    if (!userId) {
      throw ApiError.unauthorized("Authentication required");
    }
    const upload = await UploadsService.createVideoUpload(userId);
    ApiResponse.created(res, upload, "Presigned upload created");
  });
}
