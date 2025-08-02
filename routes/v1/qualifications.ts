import express from "express";
const router = express.Router();
import { Authenticator } from "../../middleware/authenticator/authenticator";
import qualificationController from "../../controller/v1/qualifications";
const authenticator = new Authenticator();
const authenticateUser = authenticator.authenticateUser;

// Create qualification route
router
  .route("/create")
  .post(authenticateUser, qualificationController.createQualification);

// Get qualification route
router
  .route("/get/:id")
  .get(authenticateUser, qualificationController.getQualifications);

// Get qualifications list
router
  .route("/list")
  .get(authenticateUser, qualificationController.getQualificationsList);

export default router;
