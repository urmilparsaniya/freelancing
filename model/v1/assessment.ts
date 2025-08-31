require("dotenv").config();
import { userAuthenticationData, UserInterface } from "../../interface/user";
import {
  AssessmentStatus,
  Entity,
  EntityType,
  RoleRoleSlug,
  Roles,
  RoleSlug,
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
import AssessmentNotes from "../../database/schema/assessment_notes";
import AssessmentNoteFiles from "../../database/schema/assessment_note_files";

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
          role: { [Op.in]: [Roles.ADMIN, Roles.ASSESSOR, Roles.IQA] },
        },
      });
      if (!userData_) {
        await transaction.rollback();
        return {
          status: STATUS_CODES.FORBIDDEN,
          message:
            "Only Admins, Assessors and IQA are allowed to create assessments.",
        };
      }
      data.assessor_id = userData_.id;
      data.center_id = userData_.center_id;
      data.assessment_status = AssessmentStatus.ASSESSMENT_CREATE;
      // Create Assessment
      let assessment = await Assessment.create(data, { transaction });

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

      const fileIds = [];
      if (files && files.length > 0) {
        for (const file of files) {
          try {
            const extension = extname(file.originalname);
            const mainFileName = `assessment/${uuidv4()}${extension}`;
            const fileUrl = await uploadFileOnAWS(file, mainFileName);
            const fileType = await this.getFileType(file.mimetype);
            const fileSize = file.size; // size in bytes
            const fileName = file.originalname;

            // Create File
            const fileCreated = await Image.create(
              {
                entity_type: Entity.ASSESSMENT,
                entity_id: assessment.id, // Remove + operator as assessment.id is already a number
                image: fileUrl,
                image_type: fileType,
                image_name: fileName,
                image_size: fileSize,
              },
              { transaction }
            );
            fileIds.push(fileCreated.id);
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

      // Handle assessment notes
      /**
       * Create main assessment note and if files are uploaded then create assessment note files
       * we need to provide the response like this
       * "questionnaires": [
            {
              "id": "Q001",
              "uploadedBy": "assessor",
              "files": [
              {
                "fileName": "questionnaire1.pdf link",
                "fileType": "pdf",
                "uploadedAt": "2025-08-27T10:15:00Z"
              },
              {
                "fileName": "questionnaire2.docx",
                "fileType": "docx",
                "uploadedAt": "2025-08-27T10:16:00Z"
              }
            ],
            "notes": "Please review both files carefully before uploading evidence."
          }
        ],
       */
      if (data.assessment_note) {
        try {
          const uploadedBy = RoleRoleSlug[userData.role]
          const assessmentNoteData = {
            assessment_id: assessment.id,
            user_id: userData_.id,
            uploaded_by: uploadedBy,
            feedback: data.assessment_note,
            is_main_assessment_note: true,
          };
          let assessmentNote = await AssessmentNotes.create(
            assessmentNoteData,
            { transaction }
          );
          if (fileIds.length > 0 && assessmentNote) {
            await AssessmentNoteFiles.bulkCreate(
              fileIds.map((fid) => ({
                assessment_note_id: assessmentNote.id,
                file_id: fid,
              })),
              { transaction }
            );
          }
        } catch (error) {
          console.error("Error creating assessment note:", error);
          await transaction.rollback();
          return {
            status: STATUS_CODES.SERVER_ERROR,
            message: "Error creating assessment note",
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
    assessmentId: string,
    learnerFiles: any
  ): Promise<any> {
    const transaction = await sequelize.transaction();
    try {
      // Check if Logged in user is not from admin | assessor throw an error
      let userData_ = await User.findOne({
        where: {
          id: userData.id,
          role: { [Op.in]: [Roles.ADMIN, Roles.ASSESSOR, Roles.LEARNER, Roles.IQA, Roles.EQA] },
        },
      });
      if (!userData_) {
        await transaction.rollback();
        return {
          status: STATUS_CODES.FORBIDDEN,
          message:
            "Only Admins, Assessors and IQA are allowed to update assessments.",
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

      let isLearner_ = await User.findOne({
        where: { id: userData.id, role: Roles.LEARNER },
      });
      // Update Assessment
      // Check if login user is learner and have uploaded learner images then changes assessment_status
      if (learnerFiles && learnerFiles.length > 0 && isLearner_) {
        data.assessment_status = AssessmentStatus.LEARNER_AGREED;
      }
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

      // Handle file uploads first
      let fileIds = [];
      if (files && files.length > 0) {
        for (const file of files) {
          try {
            const extension = extname(file.originalname);
            const mainFileName = `assessment/${uuidv4()}${extension}`;
            const fileUrl = await uploadFileOnAWS(file, mainFileName);
            const fileType = await this.getFileType(file.mimetype);
            const fileSize = file.size;
            const fileName = file.originalname;

            // Create File
            const fileCreated = await Image.create(
              {
                entity_type: Entity.ASSESSMENT,
                entity_id: assessment.id, // Remove + operator as assessment.id is already a number
                image: fileUrl,
                image_type: fileType,
                image_name: fileName,
                image_size: fileSize,
              },
              { transaction }
            );
            fileIds.push(fileCreated.id);
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

      // Handle file upload of learner
      let learnerFileIds = [];
      if (learnerFiles && learnerFiles.length > 0) {
        for (const learnerFile of learnerFiles) {
          try {
            const extension = extname(learnerFile.originalname);
            const mainFileName = `learner/${uuidv4()}${extension}`;
            const fileUrl = await uploadFileOnAWS(learnerFile, mainFileName);
            const fileType = await this.getFileType(learnerFile.mimetype);
            const fileSize = learnerFile.size;
            const fileName = learnerFile.originalname;
            // Create Learner File
            const fileCreated = await Image.create(
              {
                entity_type: Entity.LEARNER_ASSESSMENT,
                entity_id: assessment.id,
                image: fileUrl,
                image_type: fileType,
                image_name: fileName,
                image_size: fileSize,
              },
              { transaction }
            );
            learnerFileIds.push(fileCreated.id);
          } catch (error) {
            console.log("Error uploading learner file:", error);
            await transaction.rollback();
            return {
              status: STATUS_CODES.SERVER_ERROR,
              message: "Error uploading learner file",
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

      // Handle assessment notes
      if (data.assessment_note) {
        try {
          const assessmentNote = await AssessmentNotes.findAll({
            where: { assessment_id: assessment.id },
            order: [['cycle', 'DESC']]
          });
          // check if assessment note is main assessment note then update it
          if (assessmentNote.length == 1 && assessmentNote[0].is_main_assessment_note && userData_.role == Roles.ASSESSOR) {
            await assessmentNote[0].update({
              feedback: data.assessment_note,
            }, { transaction });
          } else {
            // Now we need to check if API call came from learner then we need to create new assessment note
            if (userData_.role == Roles.LEARNER) {
              let assessmentNoteData = {
                assessment_id: assessment.id,
                user_id: userData_.id,
                uploaded_by: RoleSlug.LEARNER,
                feedback: data.assessment_note,
                is_main_assessment_note: false,
                cycle: assessmentNote[0].cycle + 1 || 1,
              };
              let assessmentNote_ = await AssessmentNotes.create(assessmentNoteData, { transaction });
              if (learnerFileIds.length > 0 && assessmentNote_) {
                await AssessmentNoteFiles.bulkCreate(
                  learnerFileIds.map((fid) => ({
                    assessment_note_id: assessmentNote_.id,
                    file_id: fid,
                  })),
                  { transaction }
                );
              }
            }
            // Now need to check if API call came from assessor then need to create new assessment note but cycle number is same 
            if (userData_.role == Roles.ASSESSOR) {
              let assessmentNoteData = {
                assessment_id: assessment.id,
                user_id: userData_.id,
                uploaded_by: RoleSlug.ASSESSOR,
                feedback: data.assessment_note,
                is_main_assessment_note: false,
                cycle: assessmentNote[0].cycle,
              }
              let assessmentNote_ = await AssessmentNotes.create(assessmentNoteData, { transaction });
              if (fileIds.length > 0 && assessmentNote_) {
                await AssessmentNoteFiles.bulkCreate(
                  fileIds.map((fid) => ({
                    assessment_note_id: assessmentNote_.id,
                    file_id: fid,
                  })),
                  { transaction }
                );
              }
            }
            if (userData_.role == Roles.IQA) {
              let assessmentNoteData = {
                assessment_id: assessment.id,
                user_id: userData_.id,
                uploaded_by: RoleSlug.IQA,
                feedback: data.assessment_note,
                is_main_assessment_note: false,
                cycle: assessmentNote[0].cycle,
              }
              let assessmentNote_ = await AssessmentNotes.create(assessmentNoteData, { transaction });
              if (fileIds.length > 0 && assessmentNote_) {
                await AssessmentNoteFiles.bulkCreate(
                  fileIds.map((fid) => ({
                    assessment_note_id: assessmentNote_.id,
                    file_id: fid,
                  })),
                  { transaction }
                );
              }
            }
          }
        } catch (error) {
          console.error("Error updating assessment note:", error);
          await transaction.rollback();
          return {
            status: STATUS_CODES.SERVER_ERROR,
            message: "Error updating assessment note",
          };
        }
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
      
      // Check login user is IQA
      let isIqa = await User.findOne({
        where: { id: userData.id, role: Roles.IQA },
      });
      if (isIqa) {
        whereCondition.assessment_status = AssessmentStatus.ASSESSMENT_COMPLETED;
      }

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
        learnerWhereCondition.id = isLearner_.id;
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
      };
      let requiredQualification = false;
      if (data.qualification_id) {
        whereQualificationCondition.id = data.qualification_id;
        requiredQualification = true;
      }

      let assessment_ = await Assessment.findAndCountAll({
        where: whereCondition,
        include: [
          // {
          //   model: Methods,
          //   as: "methods",
          //   required: false,
          //   through: { attributes: [] }, // prevent including join table info
          // },
          // {
          //   model: Units,
          //   as: "units",
          //   required: false,
          //   through: { attributes: [] }, // prevent including join table info
          // },
          // {
          //   model: Image,
          //   as: "images",
          //   required: false,
          //   where: {
          //     entity_type: Entity.ASSESSMENT,
          //   },
          // },
          // {
          //   model: Image,
          //   as: "learner_image",
          //   required: false,
          //   where: {
          //     entity_type: Entity.LEARNER_ASSESSMENT,
          //   },
          // },
          {
            model: User,
            as: "learners",
            required: learnerRequired,
            where: learnerWhereCondition,
            through: { attributes: [] },
          },
          // {
          //   model: User,
          //   as: "assessor",
          //   required: false,
          // },
          {
            model: Qualifications,
            as: "qualification",
            required: requiredQualification,
            where: whereQualificationCondition,
          },
          // {
          //   model: AssessmentNotes,
          //   as: "evidence_cycles",
          //   required: false,
          //   include: [
          //     {
          //       model: Image,
          //       as: "files",
          //       required: false,
          //       through: { attributes: [] },
          //     },
          //     {
          //       model: User,
          //       as: "user",
          //       required: false,
          //       attributes: ["id", "name", "surname"],
          //     }
          //   ],
          // }
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
      let assessment: any = await Assessment.findByPk(assessmentId, {
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
          {
            model: Image,
            as: "learner_image",
            required: false,
            where: {
              entity_type: Entity.LEARNER_ASSESSMENT,
            },
          },
          {
            model: AssessmentNotes,
            as: "evidence_cycles",
            required: false,
            include: [
              {
                model: Image,
                as: "files",
                required: false,
                through: { attributes: [] },
              },
              {
                model: User,
                as: "user",
                required: false,
                attributes: ["id", "name", "surname"],
              }
            ],
          }
        ],
        order: [
          [{ model: AssessmentNotes, as: "evidence_cycles" }, "id", "DESC"]
        ]
      });

      assessment = JSON.parse(JSON.stringify(assessment));

      let learner_comment = false
      let assessor_comment = false

      if (assessment) {
        if (assessment.assessment_status == AssessmentStatus.ASSESSMENT_CREATE) {
          learner_comment = true
          assessor_comment = true
        } else if (assessment.assessment_status == AssessmentStatus.LEARNER_AGREED) {
          learner_comment = false
          assessor_comment = true
        } else if (assessment.assessment_status == AssessmentStatus.ASSESSMENT_COMPLETED) {
          learner_comment = false
          assessor_comment = false
        } else if (assessment.assessment_status == AssessmentStatus.ASSESSOR_REJECT) {
          learner_comment = true
          assessor_comment = false
        }
        assessment.learner_comment = learner_comment
        assessment.assessor_comment = assessor_comment
      }

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

      // Delete Assessment Notes 
      let assessmentNotes = await AssessmentNotes.findAll({
        where: { assessment_id: assessment.id },
        attributes: ["id"]
      })
      let assessmentNoteIds = assessmentNotes.map(
        (assessmentIds) => assessmentIds.id
      );
      // Delete Assessment Notes Files first
      if (assessmentNoteIds.length > 0) {
        await AssessmentNoteFiles.destroy({
          where: { assessment_note_id: { [Op.in]: assessmentNoteIds } },
          transaction,
          force: true
        });
      }

      // Then delete Assessment Notes
      await AssessmentNotes.destroy({
        where: { assessment_id: assessment.id },
        force: true,
        transaction,
      });

      // Soft delete the assessment
      await assessment.destroy({ force: true, transaction });

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

  // Update Assessment Status
  static async updateAssessmentStatus(
    data: any,
    assessment_id: string,
    userData: userAuthenticationData
  ): Promise<any> {
    const transaction = await sequelize.transaction();
    try {
      const assessment = await Assessment.findByPk(assessment_id);
      if (!assessment) {
        return {
          status: STATUS_CODES.NOT_FOUND,
          message: "Assessment not found",
        };
      }

      const newStatus = data.assessment_status;
      const currentStatus = assessment.assessment_status;

      // Validation rules
      if (
        newStatus === AssessmentStatus.ASSESSOR_REJECT &&
        currentStatus !== AssessmentStatus.LEARNER_AGREED
      ) {
        return {
          status: STATUS_CODES.BAD_REQUEST,
          message:
            "Action not allowed: An assessment can only be rejected after the learner has agreed. Please check the current status and try again.",
        };
      }

      if (
        newStatus === AssessmentStatus.ASSESSMENT_COMPLETED &&
        currentStatus !== AssessmentStatus.LEARNER_AGREED
      ) {
        return {
          status: STATUS_CODES.BAD_REQUEST,
          message:
            "Action not allowed: Assessment completion is only possible after learner agreement. Ensure the learner has agreed before completing.",
        };
      }

      // Update only if valid
      assessment.assessment_status = newStatus;
      assessment.feedback = data.feedback
      await assessment.save({ transaction });

      // if (data.assessment_note) {
      //   try {
      //     const assessmentNote = await AssessmentNotes.findAll({
      //       where: { assessment_id: assessment.id },
      //       order: [['cycle', 'DESC']]
      //     });
      //     // check if assessment note is main assessment note then update it
      //     if (assessmentNote.length == 1 && assessmentNote[0].is_main_assessment_note && userData_.role == Roles.ASSESSOR) {
      //       await assessmentNote[0].update({
      //         feedback: data.assessment_note,
      //       }, { transaction });
      //     } else {
      //       // Now we need to check if API call came from learner then we need to create new assessment note
      //       if (userData_.role == Roles.LEARNER) {
      //         let assessmentNoteData = {
      //           assessment_id: assessment.id,
      //           user_id: userData_.id,
      //           uploaded_by: 2,
      //           feedback: data.assessment_note,
      //           is_main_assessment_note: false,
      //           cycle: assessmentNote[0].cycle + 1 || 1,
      //         };
      //         let assessmentNote_ = await AssessmentNotes.create(assessmentNoteData, { transaction });
      //         if (learnerFileIds.length > 0 && assessmentNote_) {
      //           await AssessmentNoteFiles.bulkCreate(
      //             learnerFileIds.map((fid) => ({
      //               assessment_note_id: assessmentNote_.id,
      //               file_id: fid,
      //             })),
      //             { transaction }
      //           );
      //         }
      //       }
      //       // Now need to check if API call came from assessor then need to create new assessment note but cycle number is same 
      //       if (userData_.role == Roles.ASSESSOR) {
      //         let assessmentNoteData = {
      //           assessment_id: assessment.id,
      //           user_id: userData_.id,
      //           uploaded_by: 1,
      //           feedback: data.assessment_note,
      //           is_main_assessment_note: false,
      //           cycle: assessmentNote[0].cycle,
      //         }
      //         let assessmentNote_ = await AssessmentNotes.create(assessmentNoteData, { transaction });
      //         if (fileIds.length > 0 && assessmentNote_) {
      //           await AssessmentNoteFiles.bulkCreate(
      //             fileIds.map((fid) => ({
      //               assessment_note_id: assessmentNote_.id,
      //               file_id: fid,
      //             })),
      //             { transaction }
      //           );
      //         }
      //       }
      //     }
      //   } catch (error) {
      //     console.error("Error updating assessment note:", error);
      //     await transaction.rollback();
      //     return {
      //       status: STATUS_CODES.SERVER_ERROR,
      //       message: "Error updating assessment note",
      //     };
      //   }
      // }

      await transaction.commit();

      return {
        status: STATUS_CODES.SUCCESS,
        message: "Assessment status updated successfully",
      };
    } catch (error) {
      console.error("Error updating assessment status:", error);
      await transaction.rollback();
      return {
        status: STATUS_CODES.SERVER_ERROR,
        message: "Server error",
      };
    }
  }
}

export default AssessmentService;
