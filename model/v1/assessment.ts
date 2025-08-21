require("dotenv").config();
import { userAuthenticationData, UserInterface } from "../../interface/user";
import {
  Entity,
  EntityType,
  Roles,
  STATUS_CODES,
  STATUS_MESSAGE,
} from "../../configs/constants";
import { Op, Order, Sequelize } from "sequelize";
import {
  centerId,
  deleteFileOnAWS,
  generateSecurePassword,
  paginate,
  uploadFileOnAWS,
} from "../../helper/utils";
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
import AssessmentLearner from "../../database/schema/assessment_learners";

class AssessmentService {
  // Create Assessment
  static async createAssessment(
    data: any,
    userData: userAuthenticationData,
    files
  ): Promise<any> {
    const transaction = await sequelize.transaction();
    try {
      if ("id" in data) {
        delete data.id;
      }
      // Check if Logged in user is not from admin | assessor throw an error
      let userData_ = await User.findOne({
        where: {
          id: userData.id,
          role: { [Op.in]: [Roles.ADMIN, Roles.ASSESSOR] },
        },
      });
      if (!userData_) {
        await transaction.rollback();
        return {
          status: STATUS_CODES.FORBIDDEN,
          message:
            "Only Admins and Assessors are allowed to create assessments.",
        };
      }
      data.assessor_id = userData_.id;
      data.center_id = userData_.center_id;
      // Create Assessment
      let assessment = await Assessment.create(data, { transaction });

      if (files && files.length > 0) {
        for (const file of files) {
          try {
            const extension = extname(file.originalname);
            const mainFileName = `assessment/${uuidv4()}${extension}`;
            const fileUrl = await uploadFileOnAWS(file, mainFileName);
            const fileType = await this.getFileType(file.mimetype);

            // Create File
            await Image.create(
              {
                entity_type: Entity.ASSESSMENT,
                entity_id: assessment.id, // Remove + operator as assessment.id is already a number
                image: fileUrl,
                image_type: fileType,
              },
              { transaction }
            );
          } catch (fileError) {
            console.error("Error uploading file:", fileError);
            await transaction.rollback();
            return {
              status: STATUS_CODES.SERVER_ERROR,
              message: "Error uploading file",
            };
          }
        }
      }

      // Create Assessment Methods
      if (data.method_ids) {
        try {
          const methodsIds = data.method_ids
            .split(",")
            .map((id) => parseInt(id.trim()))
            .filter(Boolean);

          // Validate methods exist
          const validMethods = await Methods.findAll({
            where: { id: methodsIds, deletedAt: null },
          });

          if (validMethods.length !== methodsIds.length) {
            await transaction.rollback();
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
        } catch (methodError) {
          console.error("Error creating assessment methods:", methodError);
          await transaction.rollback();
          return {
            status: STATUS_CODES.SERVER_ERROR,
            message: "Error creating assessment methods",
          };
        }
      }

      // Create Assessment Units
      if (data.unit_ids) {
        try {
          const unitIds = data.unit_ids
            .split(",")
            .map((id) => parseInt(id.trim()))
            .filter(Boolean);

          // Validate units exist
          const validUnits = await Units.findAll({
            where: { id: unitIds, deletedAt: null },
          });

          if (validUnits.length !== unitIds.length) {
            await transaction.rollback();
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
        } catch (unitError) {
          console.error("Error creating assessment units:", unitError);
          await transaction.rollback();
          return {
            status: STATUS_CODES.SERVER_ERROR,
            message: "Error creating assessment units",
          };
        }
      }

      if (data.learner_id) {
        try {
          const learnerIds = data.learner_id
            .split(",")
            .map((id) => parseInt(id.trim()))
            .filter(Boolean);

          // Validate learners exist
          const validLearners = await User.findAll({
            where: { id: learnerIds, deletedAt: null, role: Roles.LEARNER },
          });

          if (validLearners.length !== learnerIds.length) {
            await transaction.rollback();
            return {
              status: STATUS_CODES.BAD_REQUEST,
              message: "Some learners are invalid",
            };
          }

          await AssessmentLearner.bulkCreate(
            learnerIds.map((lid) => ({
              assessment_id: assessment.id,
              learner_id: lid,
            })),
            { transaction }
          );
        } catch (error) {
          console.error("Error creating learner:", error);
          await transaction.rollback();
          return {
            status: STATUS_CODES.SERVER_ERROR,
            message: "Error creating assessment learner",
          };
        }
      }

      await transaction.commit();
      return {
        status: STATUS_CODES.SUCCESS,
        data: assessment,
        message: "Assessment created successfully",
      };
    } catch (error) {
      console.error("Error creating assessment:", error);
      await transaction.rollback();
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
    userData: userAuthenticationData,
    files: any,
    assessmentId: string
  ): Promise<any> {
    const transaction = await sequelize.transaction();
    try {
      // Check if Logged in user is not from admin | assessor throw an error
      let userData_ = await User.findOne({
        where: {
          id: userData.id,
          role: { [Op.in]: [Roles.ADMIN, Roles.ASSESSOR] },
        },
      });
      if (!userData_) {
        await transaction.rollback();
        return {
          status: STATUS_CODES.FORBIDDEN,
          message:
            "Only Admins and Assessors are allowed to update assessments.",
        };
      }
      let assessment = await Assessment.findByPk(assessmentId);
      if (!assessment) {
        await transaction.rollback();
        return {
          status: STATUS_CODES.NOT_FOUND,
          message: "Assessment not found",
        };
      }

      // Handle file uploads first
      if (files && files.length > 0) {
        for (const file of files) {
          try {
            const extension = extname(file.originalname);
            const mainFileName = `assessment/${uuidv4()}${extension}`;
            const fileUrl = await uploadFileOnAWS(file, mainFileName);
            const fileType = await this.getFileType(file.mimetype);

            // Create File
            await Image.create(
              {
                entity_type: Entity.ASSESSMENT,
                entity_id: assessment.id, // Remove + operator as assessment.id is already a number
                image: fileUrl,
                image_type: fileType,
              },
              { transaction }
            );
          } catch (fileError) {
            console.error("Error uploading file:", fileError);
            await transaction.rollback();
            return {
              status: STATUS_CODES.SERVER_ERROR,
              message: "Error uploading file",
            };
          }
        }
      }

      // Handle file deletions - fix race condition
      if (data.delete_files) {
        try {
          const deleteFiles: number[] = data.delete_files
            .split(",")
            .map((id) => parseInt(id.trim()));

          // Fetch images before deletion to get file URLs
          const imagesToDelete = await Image.findAll({
            where: {
              id: { [Op.in]: deleteFiles },
              entity_type: Entity.ASSESSMENT,
              entity_id: assessment.id,
            },
            transaction,
          });

          // Delete from database first
          await Image.destroy({
            where: {
              id: { [Op.in]: deleteFiles },
              entity_type: Entity.ASSESSMENT,
              entity_id: assessment.id,
            },
            force: true,
            transaction,
          });

          // Delete files from AWS after database deletion
          for (const image of imagesToDelete) {
            try {
              await deleteFileOnAWS(image.image);
            } catch (awsError) {
              console.error("Error deleting file from AWS:", awsError);
              // Continue with other deletions even if one fails
            }
          }
        } catch (deleteError) {
          console.error("Error deleting files:", deleteError);
          await transaction.rollback();
          return {
            status: STATUS_CODES.SERVER_ERROR,
            message: "Error deleting files",
          };
        }
      }

      // Update Assessment Methods
      if (data.method_ids) {
        try {
          const methodsIds = data.method_ids
            .split(",")
            .map((id) => parseInt(id.trim()))
            .filter(Boolean);

          // Validate methods exist
          const validMethods = await Methods.findAll({
            where: { id: methodsIds, deletedAt: null },
          });

          if (validMethods.length !== methodsIds.length) {
            await transaction.rollback();
            return {
              status: STATUS_CODES.BAD_REQUEST,
              message: "Some methods are invalid",
            };
          }

          await AssessmentMethod.destroy({
            where: { assessment_id: assessment.id },
            force: true,
            transaction,
          });

          await AssessmentMethod.bulkCreate(
            methodsIds.map((mid) => ({
              assessment_id: assessment.id,
              method_id: mid,
            })),
            { transaction }
          );
        } catch (methodError) {
          console.error("Error updating assessment methods:", methodError);
          await transaction.rollback();
          return {
            status: STATUS_CODES.SERVER_ERROR,
            message: "Error updating assessment methods",
          };
        }
      }

      // Update Assessment Units
      if (data.unit_ids) {
        try {
          const unitIds = data.unit_ids
            .split(",")
            .map((id) => parseInt(id.trim()))
            .filter(Boolean);

          // Validate units exist
          const validUnits = await Units.findAll({
            where: { id: unitIds, deletedAt: null },
          });

          if (validUnits.length !== unitIds.length) {
            await transaction.rollback();
            return {
              status: STATUS_CODES.BAD_REQUEST,
              message: "Some units are invalid",
            };
          }

          await AssessmentUnits.destroy({
            where: { assessment_id: assessment.id },
            force: true,
            transaction,
          });

          await AssessmentUnits.bulkCreate(
            unitIds.map((uid) => ({
              assessment_id: assessment.id,
              unit_id: uid,
            })),
            { transaction }
          );
        } catch (unitError) {
          console.error("Error updating assessment units:", unitError);
          await transaction.rollback();
          return {
            status: STATUS_CODES.SERVER_ERROR,
            message: "Error updating assessment units",
          };
        }
      }

      // Update Assessment Learners
      if (data.learner_id) {
        try {
          const learnerIds = data.learner_id
            .split(",")
            .map((id) => parseInt(id.trim()))
            .filter(Boolean);

          // Validate learners exist
          const validLearners = await User.findAll({
            where: { id: learnerIds, deletedAt: null, role: Roles.LEARNER },
          });

          if (validLearners.length !== learnerIds.length) {
            await transaction.rollback();
            return {
              status: STATUS_CODES.BAD_REQUEST,
              message: "Some learners are invalid",
            };
          }

          // Remove old learners for this assessment
          await AssessmentLearner.destroy({
            where: { assessment_id: assessment.id },
            force: true,
            transaction,
          });

          // Insert new learners
          await AssessmentLearner.bulkCreate(
            learnerIds.map((lid) => ({
              assessment_id: assessment.id,
              learner_id: lid,
            })),
            { transaction }
          );
        } catch (error) {
          console.error("Error updating assessment learners:", error);
          await transaction.rollback();
          return {
            status: STATUS_CODES.SERVER_ERROR,
            message: "Error updating assessment learners",
          };
        }
      }

      // Update Assessment
      try {
        await assessment.update(data, { transaction });
      } catch (updateError) {
        console.error("Error updating assessment:", updateError);
        await transaction.rollback();
        return {
          status: STATUS_CODES.SERVER_ERROR,
          message: "Error updating assessment",
        };
      }

      await transaction.commit();
      return {
        status: STATUS_CODES.SUCCESS,
        data: null,
        message: "Assessment updated successfully",
      };
    } catch (error) {
      console.error("Error updating assessment:", error);
      await transaction.rollback();
      return {
        status: STATUS_CODES.SERVER_ERROR,
        message: "Server error",
      };
    }
  }

  // List Assessment
  static async listAssessment(
    data: any,
    userData: userAuthenticationData
  ): Promise<any> {
    try {
      const limit = data?.limit ? +data.limit : 0;
      const page = data?.page ? +data.page : 0;
      let offset = (page - 1) * limit;
      let sort_by = data?.sort_by || "createdAt";
      let sort_order = data?.sort_order || "ASC";
      let order: Order = [[sort_by, sort_order]];
      const fetchAll = limit === 0 || page === 0;

      // Where condition
      let whereCondition: any = {
        deletedAt: null,
      };

      let learnerWhereCondition: any = {
        deletedAt: null,
      };
      let learnerRequired = false;

      // Check if Logged in user is Learner then need to show only assigned assessment of that learner
      let isLearner_ = await User.findOne({
        where: { id: userData.id, role: Roles.LEARNER },
      });
      if (isLearner_) {
        learnerRequired = true;
        learnerWhereCondition.learner_id = isLearner_.id;
      }
      if (data.learner_id) {
        const learnerIds = data.learner_id
          .split(",")
          .map((id) => parseInt(id.trim()))
          .filter(Boolean);

        if (learnerIds.length > 0) {
          learnerWhereCondition.id = { [Op.in]: learnerIds };
          learnerRequired = true;
        }
      }
      let whereQualificationCondition: any = {
        deletedAt: null,
      }
      let requiredQualification = false
      if (data.qualification_id) {
        whereQualificationCondition.id = data.qualification_id;
        requiredQualification = true
      }

      let assessment_ = await Assessment.findAndCountAll({
        where: whereCondition,
        include: [
          {
            model: Methods,
            as: "methods",
            required: false,
            through: { attributes: [] }, // prevent including join table info
          },
          {
            model: Units,
            as: "units",
            required: false,
            through: { attributes: [] }, // prevent including join table info
          },
          {
            model: Image,
            as: "images",
            required: false,
            where: {
              entity_type: Entity.ASSESSMENT,
            },
          },
          {
            model: User,
            as: "learners",
            required: learnerRequired,
            where: learnerWhereCondition,
            through: { attributes: [] },
          },
          {
            model: User,
            as: "assessor",
            required: false,
          },
          {
            model: Qualifications,
            as: "qualification",
            required: requiredQualification,
            where: whereQualificationCondition
          }
        ],
        limit: fetchAll ? undefined : limit,
        offset: fetchAll ? undefined : offset,
        order,
        distinct: true,
      });

      assessment_ = JSON.parse(JSON.stringify(assessment_));
      const pagination = await paginate(assessment_, limit, page, fetchAll);
      const response = {
        data: assessment_.rows,
        pagination: pagination,
      };

      return {
        status: STATUS_CODES.SUCCESS,
        data: response,
        message: "Assessment listed successfully",
      };
    } catch (error) {
      console.error("Error listing assessment:", error);
      return {
        status: STATUS_CODES.SERVER_ERROR,
        message: "Server error",
      };
    }
  }

  // Get Assessment by ID
  static async getAssessmentById(
    assessmentId: string,
    userData: userAuthenticationData
  ): Promise<any> {
    try {
      let assessment = await Assessment.findByPk(assessmentId, {
        include: [
          {
            model: Methods,
            as: "methods",
            required: false,
            through: { attributes: [] },
          },
          {
            model: Units,
            as: "units",
            required: false,
            through: { attributes: [] },
          },
          {
            model: Image,
            as: "images",
            required: false,
            where: {
              entity_type: Entity.ASSESSMENT,
            },
          },
        ],
      });

      assessment = JSON.parse(JSON.stringify(assessment));

      return {
        status: STATUS_CODES.SUCCESS,
        data: assessment,
        message: "Assessment fetched successfully",
      };
    } catch (error) {
      console.error("Error fetching assessment:", error);
      return {
        status: STATUS_CODES.SERVER_ERROR,
        message: "Server error",
      };
    }
  }

  // Delete Assessment
  static async deleteAssessment(
    assessmentId: string,
    userData: userAuthenticationData
  ): Promise<any> {
    const transaction = await sequelize.transaction();
    try {
      const assessment = await Assessment.findByPk(assessmentId);
      if (!assessment) {
        await transaction.rollback();
        return {
          status: STATUS_CODES.NOT_FOUND,
          message: "Assessment not found",
        };
      }

      // Delete related images from AWS first
      const images = await Image.findAll({
        where: {
          entity_type: Entity.ASSESSMENT,
          entity_id: assessment.id,
        },
      });

      for (const image of images) {
        try {
          await deleteFileOnAWS(image.image);
        } catch (awsError) {
          console.error("Error deleting file from AWS:", awsError);
        }
      }

      // Delete related records
      await AssessmentMethod.destroy({
        where: { assessment_id: assessment.id },
        force: true,
        transaction,
      });

      await AssessmentUnits.destroy({
        where: { assessment_id: assessment.id },
        force: true,
        transaction,
      });

      await AssessmentLearner.destroy({
        where: { assessment_id: assessment.id },
        force: true,
        transaction,
      });

      await Image.destroy({
        where: {
          entity_type: Entity.ASSESSMENT,
          entity_id: assessment.id,
        },
        force: true,
        transaction,
      });

      // Soft delete the assessment
      await assessment.destroy({ transaction });

      await transaction.commit();
      return {
        status: STATUS_CODES.SUCCESS,
        message: "Assessment deleted successfully",
      };
    } catch (error) {
      console.error("Error deleting assessment:", error);
      await transaction.rollback();
      return {
        status: STATUS_CODES.SERVER_ERROR,
        message: "Server error",
      };
    }
  }
}

export default AssessmentService;
