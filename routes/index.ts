import dotenv from "dotenv";
import { Response, Request, Application } from "express";
import multer from "multer";
import { STATUS_CODES } from "../configs/constants";
import userRoute from "./v1/user";
import qualificationRoute from "./v1/qualifications";

dotenv.config();

// Configure Multer to use memory storage
const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // Limit file size to 10 MB
});

export default (app: Application): void => {
  // Application Welcome
  app.get("/" + process.env.API_BASE_URL, (req: Request, res: Response) => {
    res
      .status(STATUS_CODES.SUCCESS)
      .send(`Welcome to ${process.env.PROJECT_NAME}`);
  });

  // User Routes
  app.use(
    "/" + process.env.API_BASE_URL + "/v1/user",
    upload.single("file"), // Use multer
    userRoute
  );

  // Qualification Routes
  app.use(
    "/" + process.env.API_BASE_URL + "/v1/qualifications",
    upload.single("file"), // Use multer
    qualificationRoute
  );
};
