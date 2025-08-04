require("dotenv").config();
import { userAuthenticationData, UserInterface } from "../../interface/user";
import { Roles, STATUS_CODES, STATUS_MESSAGE } from "../../configs/constants";
import { Op, Order, Sequelize } from "sequelize";
import { paginate } from "../../helper/utils";
import User from "../../database/schema/user";
const { sequelize } = require("../../configs/database");

class AssessorService {
  // Create Assessor
  static async createAssessor(
    data: UserInterface,
    userData: userAuthenticationData
  ): Promise<any> {
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
      data.role = Roles.ASSESSOR;
      data.password = "Admin@123456";
      let createUser = await User.create(data);
      return {
        data: createUser,
        message: "Assessor Created Successfully",
        status: STATUS_CODES.SUCCESS,
      };
    } catch (error) {
      console.log(error);
      return {
        status: STATUS_CODES.SERVER_ERROR,
        message: STATUS_MESSAGE.ERROR_MESSAGE.INTERNAL_SERVER_ERROR,
      };
    }
  }

  // Update Assessor
  static async updateAssessor(
    data: UserInterface,
    userId: string | number,
    userData: userAuthenticationData
  ) {
    try {
      // Check is valid user
      let isValidUser = await User.findOne({
        where: { id: userId, deletedAt: null },
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
          id: { [Op.ne]: userId },
          deletedAt: null,
        },
      });
      if (isEmailUsed) {
        return {
          status: STATUS_CODES.BAD_REQUEST,
          message: "Email already used",
        };
      }
      await User.update(data, {
        where: { id: userId },
      });
      return {
        data: {},
        status: STATUS_CODES.SUCCESS,
        message: "Assessor Updated Successfully",
      };
    } catch (error) {
      return {
        status: STATUS_CODES.SERVER_ERROR,
        message: STATUS_MESSAGE.ERROR_MESSAGE.INTERNAL_SERVER_ERROR,
      };
    }
  }

  // List Assessor
  static async listAssessor(data, userData: userAuthenticationData) {
    try {
      const limit = data?.limit ? +data.limit : 0;
      const page = data?.page ? +data.page : 0;
      let offset = (page - 1) * limit;
      let sort_by = data?.sort_by || "createdAt";
      let sort_order = data?.sort_order || "ASC";
      let order: Order = [[sort_by, sort_order]];
      const fetchAll = limit === 0 || page === 0;
      let userData_ = await User.findAndCountAll({
        where: { deletedAt: null, role: Roles.ASSESSOR },
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
        message: "Assessor List fetched successfully",
      };
    } catch (error) {
      console.log(error)
      return {
        status: STATUS_CODES.SERVER_ERROR,
        message: STATUS_MESSAGE.ERROR_MESSAGE.INTERNAL_SERVER_ERROR,
      };
    }
  }
}

export default AssessorService;
