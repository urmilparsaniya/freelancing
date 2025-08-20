import { Request, Response } from "express";
import { STATUS_CODES, STATUS_MESSAGE } from "../../configs/constants";
import { userAuthenticationData } from "../../interface/user";
import AssessmentService from "../../model/v1/assessment";

class assessmentController {
  // Create Assessment
  static async createAssessment(req: Request, res: Response): Promise<void> {
    try {
      let data = req.body;
      let files = req.files;
      let userData = req.headers["user_info"] as userAuthenticationData;
      let request = await AssessmentService.createAssessment(data, userData, files);
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

  // Update Assessment 
  static async updateAssessment(req: Request, res: Response): Promise<void> {
    try {
      let data = req.body;
      let userData = req.headers["user_info"] as userAuthenticationData;
      let files = req.files;
      let assessmentId = req.params.id;
      let request = await AssessmentService.updateAssessment(data, userData, files, assessmentId);
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

  // List Assessment
  static async listAssessment(req: Request, res: Response): Promise<void> {
    try {
      let data = req.query;
      let userData = req.headers["user_info"] as userAuthenticationData;
      let request = await AssessmentService.listAssessment(data, userData);
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

  // Delete Assessment
  static async deleteAssessment(req: Request, res: Response): Promise<void> {
    try {
      let assessmentId = req.params.id;
      let userData = req.headers["user_info"] as userAuthenticationData;
      let request = await AssessmentService.deleteAssessment(assessmentId, userData);
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

  // Get Assessment
  static async getAssessment(req: Request, res: Response): Promise<void> {
    try {
      let assessmentId = req.params.id;
      let userData = req.headers["user_info"] as userAuthenticationData;
      let request = await AssessmentService.getAssessmentById(assessmentId, userData);
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

export default assessmentController;