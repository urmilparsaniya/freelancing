require("dotenv").config();
import { userAuthenticationData, UserInterface } from "../../interface/user";
import { Entity, EntityType, Roles, STATUS_CODES, STATUS_MESSAGE } from "../../configs/constants";
import { Op, Order, Sequelize } from "sequelize";
import { centerId, generateSecurePassword, paginate, uploadFileOnAWS } from "../../helper/utils";
import User from "../../database/schema/user";
import Qualifications from "../../database/schema/qualifications";
import UserQualification from "../../database/schema/user_qualification";
import { emailService } from "../../helper/emailService";
import UserLearner from "../../database/schema/user_learner";
import Center from "../../database/schema/center";
const { sequelize } = require("../../configs/database");
import Assessment from "../../database/schema/assessment";
import Image from "../../database/schema/images";
import Units from "../../database/schema/units";
import Methods from "../../database/schema/methods";
import { v4 as uuidv4 } from "uuid";
import { extname } from "path";

class AssessmentService {
  // Create Assessment
  static async createAssessment(
    data: any,
    userData: userAuthenticationData,
    files
  ): Promise<any> {
    const transaction = await sequelize.transaction();
    try {
      // Validate unit_id and method_id is exists
      let unit = await Units.findOne({
        where: {
          id: data.unit_id,
          deletedAt: null,
        },
      });
      if (!unit) {
        return {
          status: STATUS_CODES.BAD_REQUEST,
          message: "Unit not found",
        };
      }
      let method = await Methods.findOne({
        where: {
          id: data.method_id,
          deletedAt: null,
        },
      });
      if (!method) {
        return {
          status: STATUS_CODES.BAD_REQUEST,
          message: "Method not found",
        };
      }
      // Create Assessment
      let assessment = await Assessment.create(data, { transaction });
      if (files && files.length > 0) {
        for (const file of files) {
          const extension = extname(file.originalname);
          const mainFileName = `assessment/${uuidv4()}${extension}`;
          const fileUrl = await uploadFileOnAWS(file, mainFileName);
          const fileType = await this.getFileType(file.mimetype);
          // Create File
          await Image.create({
            entity_type: Entity.ASSESSMENT,
            entity_id: +assessment.id,
            image: fileUrl,
            image_type: fileType,
          }, { transaction });
        }
      }
      // await transaction.commit();
      return {
        status: STATUS_CODES.SUCCESS,
        data: assessment,
        message: "Assessment created successfully",
      };
    } catch (error) {
      console.error("Error creating assessment:", error);
      return {
        status: STATUS_CODES.SERVER_ERROR,
        message: "Server error",
      };
    }
  }

  static async getFileType(mimeType: string) {
    if (!mimeType) return EntityType.OTHER;

    if (mimeType.startsWith("image/")) return EntityType.IMAGE;
    if (mimeType.startsWith("video/")) return EntityType.VIDEO;
    if (mimeType.startsWith("audio/")) return EntityType.AUDIO;

    // Common document types
    if (
      mimeType === "application/pdf" ||
      mimeType === "application/msword" ||
      mimeType ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      mimeType ===
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      mimeType ===
        "application/vnd.openxmlformats-officedocument.presentationml.presentation"
    ) {
      return EntityType.DOCUMENT;
    }

    return EntityType.OTHER;
  }
}

export default AssessmentService;
