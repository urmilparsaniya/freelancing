import express from "express";
const router = express.Router();
import { body } from "express-validator";
import validate from "../../middleware/validator/validator";
import { STATUS_MESSAGE } from "../../configs/constants";
import { validateEmail } from "../../helper/utils";
import { Authenticator } from "../../middleware/authenticator/authenticator";
import userAuthController from "../../controller/v1/user";
const authenticator = new Authenticator();
const authenticateUser = authenticator.authenticateUser;

router
  .route("/login")
  .post(
    validate([
      body("email")
        .trim()
        .notEmpty()
        .withMessage(STATUS_MESSAGE.USER.ERROR_MESSAGE.EMAIL_REQUIRED),
      body("password")
        .trim()
        .notEmpty()
        .withMessage(STATUS_MESSAGE.USER.ERROR_MESSAGE.PASSWORD_REQUIRED),
    ]),
    userAuthController.login
  );

export default router;