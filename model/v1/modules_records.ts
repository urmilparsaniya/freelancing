require("dotenv").config();
import { userAuthenticationData, UserInterface } from "../../interface/user";
import { Entity, EntityType, Roles, STATUS_CODES, STATUS_MESSAGE } from "../../configs/constants";
import { Op, Order, Sequelize } from "sequelize";
import { centerId, deleteFileOnAWS, generateSecurePassword, paginate, uploadFileOnAWS } from "../../helper/utils";
import User from "../../database/schema/user";
import Qualifications from "../../database/schema/qualifications";
import UserQualification from "../../database/schema/user_qualification";
import { emailService } from "../../helper/emailService";
import UserLearner from "../../database/schema/user_learner";
import Center from "../../database/schema/center";
import { extname } from "path";
import { v4 as uuidv4 } from "uuid";
import { ModuleRecordsInterface } from "../../interface/modules_records";
import ModuleRecords from "../../database/schema/modules_records";
import Image from "../../database/schema/images";
const { sequelize } = require("../../configs/database");

class ModuleRecordsService {
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
  // Create module records
  static async createModuleRecords(
    data: ModuleRecordsInterface,
    userData: userAuthenticationData,
    files
  ): Promise<any> {
    const transaction = await sequelize.transaction();
    try {
      if ("id" in data) {
        delete data.id;
      }
      data.center_id = userData.center_id
      data.created_by = userData.id
      // Create module records
      let moduleRecords = await ModuleRecords.create(data, { transaction })
      const fileIds = [];
      if (files && files.length > 0) {
        for (const file of files) {
          try {
            const extension = extname(file.originalname);
            const mainFileName = `modulerecords/${uuidv4()}${extension}`;
            const fileUrl = await uploadFileOnAWS(file, mainFileName);
            const fileType = await this.getFileType(file.mimetype);
            const fileSize = file.size; // size in bytes
            const fileName = file.originalname;

            // Create File
            const fileCreated = await Image.create(
              {
                entity_type: Entity.MODULE_RECORDS,
                entity_id: moduleRecords.id, // Remove + operator as assessment.id is already a number
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
      await transaction.commit();
      return {
        status: STATUS_CODES.SUCCESS,
        data: moduleRecords,
        message: "Module Record Created Successfully"
      }
    } catch (error) {
      await transaction.rollback();
      console.log(error);
      return {
        status: STATUS_CODES.SERVER_ERROR,
        message: STATUS_MESSAGE.ERROR_MESSAGE.INTERNAL_SERVER_ERROR,
      };
    }
  }

  // update module records 
  static async updateModuleRecords(
    moduleId: number,
    data: ModuleRecordsInterface,
    userData: userAuthenticationData,
    files
  ): Promise<any> {
    const transaction = await sequelize.transaction();
    try {
      const moduleRecord = await ModuleRecords.findOne({
        where: {
          id: moduleId,
        },
        transaction
      });
      if (!moduleRecord) {
        await transaction.rollback();
        return {
          status: STATUS_CODES.NOT_FOUND,
          message: "Module Record Not Found"
        }
      }
      await moduleRecord.update(data, { transaction });
      // files
      let fileIds = [];
      if (files && files.length > 0) {
        for (const file of files) {
          try {
            const extension = extname(file.originalname);
            const mainFileName = `modulerecords/${uuidv4()}${extension}`;
            const fileUrl = await uploadFileOnAWS(file, mainFileName);
            const fileType = await this.getFileType(file.mimetype);
            const fileSize = file.size;
            const fileName = file.originalname;

            // Create File
            const fileCreated = await Image.create(
              {
                entity_type: Entity.MODULE_RECORDS,
                entity_id: moduleId, // Remove + operator as assessment.id is already a number
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
      // Handle file deletions - fix race condition
      if (data.delete_files) {
        try {
          const deleteFiles: number[] = data.delete_files
            .toString()
            .split(",")
            .map((id) => parseInt(id.trim()));

          // Fetch images before deletion to get file URLs
          const imagesToDelete = await Image.findAll({
            where: {
              id: { [Op.in]: deleteFiles },
              entity_type: Entity.MODULE_RECORDS,
              entity_id: moduleId,
            },
            transaction,
          });

          // Delete from database first
          await Image.destroy({
            where: {
              id: { [Op.in]: deleteFiles },
              entity_type: Entity.MODULE_RECORDS,
              entity_id: moduleId,
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
      await transaction.commit();
      return {
        status: STATUS_CODES.SUCCESS,
        data: {},
        message: "Module Record Updated Successfully"
      }
    } catch (error) {
      await transaction.rollback();
      console.log(error);
      return {
        status: STATUS_CODES.SERVER_ERROR,
        message: STATUS_MESSAGE.ERROR_MESSAGE.INTERNAL_SERVER_ERROR,
      };
    }
  }

  // List Module Records
  static async listModuleRecords(
    data: any,
    userData: userAuthenticationData
  ): Promise<any> {
    try {
      const limit = data?.limit ? +data.limit : 0;
      const page = data?.page ? +data.page : 0;
      let offset = (page - 1) * limit;
      let sort_by = data?.sort_by || "createdAt";
      let sort_order = data?.sort_order || "DESC";
      let order: Order = [[sort_by, sort_order]];
      const fetchAll = limit === 0 || page === 0;

      const whereClause: any = {
        deletedAt: null,
      };

      if (data.center_id) {
        whereClause.center_id = data.center_id;
      }
      //  else {
      //   whereClause.center_id = userData.center_id;
      // }

      if (data.module_type) {
        whereClause.module_type = +data.module_type;
      }

      // Search
      let search = data?.search || "";
      let searchOptions = {};
      if (search) {
        searchOptions = {
          [Op.or]: [
            { title: { [Op.like]: `%${search}%` } },
          ]
        };
      }
      
      let moduleRecords = await ModuleRecords.findAndCountAll({
        where: {
          ...searchOptions,
          ...whereClause
        },
        include: [
          {
            model: Image,
            as: "images_module_records",
            attributes: ["id", "image", "image_type", "image_name", "image_size"],
          },
        ],
        limit: fetchAll ? undefined : limit,
        offset: fetchAll ? undefined : offset,
        order,
        distinct: true,
      });
      moduleRecords = JSON.parse(JSON.stringify(moduleRecords));
      const pagination = await paginate(moduleRecords, limit, page, fetchAll);
      const response = {
        data: moduleRecords.rows,
        pagination: pagination,
      }
      return {
        status: STATUS_CODES.SUCCESS,
        data: response,
        message: "Module Records Listed Successfully"
      }
    } catch (error) {
      console.log(error);
      return {
        status: STATUS_CODES.SERVER_ERROR,
        message: STATUS_MESSAGE.ERROR_MESSAGE.INTERNAL_SERVER_ERROR,
      };
    }
  }

  // Delete Module Records
  static async deleteModuleRecords(
    moduleId: number,
    data: any,
    userData: userAuthenticationData
  ): Promise<any> {
    try {
      const moduleRecord = await ModuleRecords.findOne({
        where: {
          id: moduleId,
        },
      });
      if (!moduleRecord) {
        return {
          status: STATUS_CODES.NOT_FOUND,
          message: "Module Record Not Found"
        }
      }
      await moduleRecord.destroy({
        force: true
      });
      return {
        status: STATUS_CODES.SUCCESS,
        data: {},
        message: "Module Record Deleted Successfully"
      }
    } catch (error) {
      console.log(error);
      return {
        status: STATUS_CODES.SERVER_ERROR,
        message: STATUS_MESSAGE.ERROR_MESSAGE.INTERNAL_SERVER_ERROR,
      };
    }
  }
}

export default ModuleRecordsService;
