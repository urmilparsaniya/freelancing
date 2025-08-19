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
import AssessmentMethod from "../../database/schema/assessment_methods";
import AssessmentUnits from "../../database/schema/assessment_units";

class AssessmentService {
  // Create Assessment
  static async createAssessment(
    data: any,
    userData: userAuthenticationData,
    files
  ): Promise<any> {
    const transaction = await sequelize.transaction();
    try {
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
      // Create Assessment Methods
      if (data.method_ids) {
        const methodsIds = data.method_ids
          .split(",")
          .map((id) => parseInt(id.trim()))
          .filter(Boolean);
        // Validate methods exist
        console.log(methodsIds)
        const validMethods = await Methods.findAll({
          where: { id: methodsIds, deletedAt: null },
        });
        if (validMethods.length !== methodsIds.length) {
          return {
            status: STATUS_CODES.BAD_REQUEST,
            message: "Some methods are invalid",
          };
        }
        await AssessmentMethod.bulkCreate(
          methodsIds.map((mid) => ({
            assessment_id: assessment.id,
            method_id: mid,
          })),
          { transaction }
        );
      }
      // Create Assessment Units
      if (data.unit_ids) {
        const unitIds = data.unit_ids
          .split(",")
          .map((id) => parseInt(id.trim()))
          .filter(Boolean);
        // Validate unit exist 
        const validUnits = await Units.findAll({
          where: { id: unitIds, deletedAt: null },
        });
        if (validUnits.length !== unitIds.length) {
          return {
            status: STATUS_CODES.BAD_REQUEST,
            message: "Some units are invalid",
          };
        }
        await AssessmentUnits.bulkCreate(
          unitIds.map((uid) => ({
            assessment_id: assessment.id,
            unit_id: uid,
          })),
          { transaction }
        );
      }
      await transaction.commit();
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

  // Update Assessment
  static async updateAssessment(
    data: any,
    userData: userAuthenticationData
  ): Promise<any> {
    try {
      
      return {
        status: STATUS_CODES.SUCCESS,
        data: null,
        message: "Assessment updated successfully",
      };
    } catch (error) {
      console.error("Error updating assessment:", error);
      return {
        status: STATUS_CODES.SERVER_ERROR,
        message: "Server error",
      };
    }
  }
}

export default AssessmentService;
