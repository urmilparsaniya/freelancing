import { Request, Response } from "express";
import { STATUS_CODES, STATUS_MESSAGE } from "../../configs/constants";
import userAuthService from "../../model/v1/user";

class userAuthController {
  // Login method for user authentication
  static async login(req: Request, res: Response): Promise<void> {
    try {
      let data = req.body;
      let request = await userAuthService.userAuth(data);
      if (request.status !== STATUS_CODES.SUCCESS) {
        res.handler.errorResponse(request.status, request.message);
        return;
      }
      res.handler.successResponse(
        request.status,
        request.data,
        request.message
      );
    } catch (error) {
      error = "server error";
      res.handler.serverError(error);
    }
  }
}

export default userAuthController;