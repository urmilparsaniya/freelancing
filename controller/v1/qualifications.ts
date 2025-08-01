import { Request, Response } from "express";
import { STATUS_CODES, STATUS_MESSAGE } from "../../configs/constants";
import qualificationService from "../../model/v1/qualifications";
import { userAuthenticationData } from "../../interface/user";

class qualificationController {
  // Create qualification method
  static async createQualification(req: Request, res: Response): Promise<void> {
    try {
      let body = req.body;
      let userData = req.headers['user_info'] as userAuthenticationData;
      let file = req.file;
      let request = await qualificationService.createQualification(body, userData, file);
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
  // Get qualifications method
  static async getQualifications(req: Request, res: Response): Promise<void> {
    try {
      let qualificationId = req.params.id as number | string;
      let userData = req.headers['user_info'] as userAuthenticationData;
      let request = await qualificationService.getQualifications(qualificationId, userData);
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

export default qualificationController;