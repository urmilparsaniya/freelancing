import express from "express";
const router = express.Router();
import { body } from "express-validator";
import validate from "../../middleware/validator/validator";
import { Authenticator } from "../../middleware/authenticator/authenticator";
const authenticator = new Authenticator();
const authenticateUser = authenticator.authenticateUser;
import assessmentController from "../../controller/v1/assessment";

router
  .route("/create")
  .post(
    validate([
      body("title").trim().notEmpty().withMessage("Title is required"),
      body("date").trim().notEmpty().withMessage("Date is required"),
      body("location").trim().notEmpty().withMessage("Location is required"),
      body("details").trim().notEmpty().withMessage("Details are required"),
      body("unit_ids").notEmpty().withMessage("Unit ID is required"),
      body("method_ids").notEmpty().withMessage("Method ID is required"),
    ]), // Add any necessary validation here
    authenticateUser, 
    assessmentController.createAssessment
  );

// Update Assessment
router
  .route("/update/:id")
  .put(authenticateUser, assessmentController.updateAssessment);

export default router;