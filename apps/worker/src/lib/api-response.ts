import type { Response } from "express";

export interface ApiResponseBody<T> {
  success: boolean;
  message: string;
  data: T;
  requestId?: string;
}

export abstract class ApiResponse {
  static send<T>(
    res: Response,
    statusCode: number,
    data: T,
    message = "OK",
  ): Response {
    const body: ApiResponseBody<T> = {
      success: statusCode >= 200 && statusCode < 400,
      message,
      data,
      requestId: String(res.req.id),
    };
    return res.status(statusCode).json(body);
  }

  static ok<T>(res: Response, data: T, message = "OK"): Response {
    return this.send(res, 200, data, message);
  }

  static created<T>(res: Response, data: T, message = "Created"): Response {
    return this.send(res, 201, data, message);
  }

  static noContent(res: Response): Response {
    return res.status(204).send();
  }
}
