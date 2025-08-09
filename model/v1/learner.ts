require("dotenv").config();
import { userAuthenticationData, UserInterface } from "../../interface/user";
import { Roles, STATUS_CODES, STATUS_MESSAGE } from "../../configs/constants";
import { Op, Order, Sequelize } from "sequelize";
import { paginate, generateSecurePassword } from "../../helper/utils";
import { emailService } from "../../helper/emailService";
import User from "../../database/schema/user";
import Qualifications from "../../database/schema/qualifications";
import UserQualification from "../../database/schema/user_qualification";
const { sequelize } = require("../../configs/database");

class LearnerService {
  // Create Learner
  static async createLearner(
    data: UserInterface,
    userData: userAuthenticationData
  ): Promise<any> {
    const transaction = await sequelize.transaction();
    try {
      // Check if email already used
      let isEmailUsed = await User.findOne({
        where: { email: data.email, deletedAt: null },
        attributes: ["id"],
      });
      if (isEmailUsed) {
        return {
          status: STATUS_CODES.BAD_REQUEST,
          message: "Email already used",
        };
      }
      data.role = Roles.LEARNER;
      data.center_id = userData.center_id;
      // Generate Secure Password
      data.password = await generateSecurePassword();
      let createUser = await User.create(data, { transaction });
      // Create Qualification of Learner
      // Parse qualifications (assuming it's a comma-separated string)
      if (!data.qualifications) {
        return {
          status: STATUS_CODES.BAD_REQUEST,
          message: "Qualification Required",
        };
      }
      const qualificationIds = data.qualifications
        .split(",")
        .map((id) => parseInt(id.trim()))
        .filter(Boolean);

      // Validate qualifications exist
      const validQualifications = await Qualifications.findAll({
        where: { id: qualificationIds },
      });

      if (validQualifications.length !== qualificationIds.length) {
        return {
          status: STATUS_CODES.BAD_REQUEST,
          message: "Some qualifications are invalid",
        };
      }
      await UserQualification.bulkCreate(
        qualificationIds.map((qid) => ({
          user_id: createUser.id,
          qualification_id: qid,
        }))
      );
      // Send Email to Learner
      await emailService.sendLearnerAccountEmail(
        createUser.name,
        createUser.email,
        data.password // Use the original password before hashing
      );
      await transaction.commit();
      return {
        data: createUser,
        message: "Learner Created Successfully",
        status: STATUS_CODES.SUCCESS,
      };
    } catch (error) {
      await transaction.rollback();
      console.log(error);
      return {
        status: STATUS_CODES.SERVER_ERROR,
        message: STATUS_MESSAGE.ERROR_MESSAGE.INTERNAL_SERVER_ERROR,
      };
    }
  }

  // Update Learner
  static async updateLearner(
    learnerId: number | string,
    data: UserInterface,
    userData: userAuthenticationData
  ) {
    const transaction = await sequelize.transaction();
    try {
      // Check is valid user
      let isValidUser = await User.findOne({
        where: { id: learnerId, deletedAt: null },
      });
      if (!isValidUser) {
        return {
          status: STATUS_CODES.BAD_REQUEST,
          message: "User not found",
        };
      }
      // check if email already used
      let isEmailUsed = await User.findOne({
        where: {
          email: data.email,
          id: { [Op.ne]: learnerId },
          deletedAt: null,
        },
      });
      if (isEmailUsed) {
        return {
          status: STATUS_CODES.BAD_REQUEST,
          message: "Email already used",
        };
      }
      data.center_id = userData.center_id;
      // Update user data
      await User.update(data, {
        where: { id: learnerId },
      });

      if (data.qualifications) {
        const qualificationIds = data.qualifications
          .split(",")
          .map((id) => parseInt(id.trim()))
          .filter(Boolean);

        // Validate qualification IDs
        const validQualifications = await Qualifications.findAll({
          where: { id: qualificationIds },
        });

        if (validQualifications.length !== qualificationIds.length) {
          return {
            status: STATUS_CODES.BAD_REQUEST,
            message: "Some qualifications are invalid",
          };
        }

        // Remove old qualifications
        await UserQualification.destroy({
          where: { user_id: learnerId },
          force: true
        });

        // Insert updated qualifications
        await UserQualification.bulkCreate(
          qualificationIds.map((qid) => ({
            user_id: +learnerId,
            qualification_id: qid,
          }))
        );
      }
      await transaction.commit();
      return {
        data: {},
        status: STATUS_CODES.SUCCESS,
        message: "Learner Updated Successfully",
      };
    } catch (error) {
      await transaction.rollback();
      return {
        status: STATUS_CODES.SERVER_ERROR,
        message: STATUS_MESSAGE.ERROR_MESSAGE.INTERNAL_SERVER_ERROR,
      };
    }
  }

  // List Learner
  static async listLearner(data, userData: userAuthenticationData) {
    try {
      const limit = data?.limit ? +data.limit : 0;
      const page = data?.page ? +data.page : 0;
      let offset = (page - 1) * limit;
      let sort_by = data?.sort_by || "createdAt";
      let sort_order = data?.sort_order || "ASC";
      let order: Order = [[sort_by, sort_order]];
      const fetchAll = limit === 0 || page === 0;
      let userData_ = await User.findAndCountAll({
        where: { deletedAt: null, role: Roles.LEARNER },
        include: [
          {
            model: Qualifications,
            as: "qualifications",
            through: { attributes: [] }, // prevent including join table info
          },
        ],
        limit: fetchAll ? undefined : limit,
        offset: fetchAll ? undefined : offset,
        order,
        distinct: true,
      });
      userData_ = JSON.parse(JSON.stringify(userData_));
      const pagination = await paginate(userData_, limit, page, fetchAll);
      const response = {
        data: userData_.rows,
        pagination: pagination,
      };
      return {
        status: STATUS_CODES.SUCCESS,
        data: response,
        message: "Learner List fetched successfully",
      };
    } catch (error) {
      console.log(error);
      return {
        status: STATUS_CODES.SERVER_ERROR,
        message: STATUS_MESSAGE.ERROR_MESSAGE.INTERNAL_SERVER_ERROR,
      };
    }
  }

  // Delete Learner
  static async deleteLearner(
    learnerId: number | string,
    userData: userAuthenticationData
  ) {
    try {
      let learnerData = await User.findOne({
        where: { id: learnerId, deletedAt: null, role: Roles.LEARNER },
        attributes: ["id"],
      });
      if (!learnerData) {
        return {
          status: STATUS_CODES.BAD_REQUEST,
          message: "Learner not found",
        };
      }
      let deleteLearner = await User.destroy({
        where: { id: learnerId },
        force: true
      });
      let deleteUserQualification = await UserQualification.destroy({
        where: { user_id: learnerId },
        force: true
      });
      return {
        status: STATUS_CODES.SUCCESS,
        data: {},
        message: "Learner deleted successfully",
      };
    } catch (error) {
      console.log(error);
      return {
        status: STATUS_CODES.SERVER_ERROR,
        message: STATUS_MESSAGE.ERROR_MESSAGE.INTERNAL_SERVER_ERROR,
      };
    }
  }
}

export default LearnerService;
