require("dotenv").config();
import { userAuthenticationData, UserInterface } from "../../interface/user";
import { Roles, STATUS_CODES, STATUS_MESSAGE } from "../../configs/constants";
import { Op, Order, Sequelize } from "sequelize";
import { generateSecurePassword, paginate } from "../../helper/utils";
import User from "../../database/schema/user";
import Qualifications from "../../database/schema/qualifications";
import UserQualification from "../../database/schema/user_qualification";
import { emailService } from "../../helper/emailService";
import Role from "../../database/schema/role";
import Center from "../../database/schema/center";
import Methods from "../../database/schema/methods";
const { sequelize } = require("../../configs/database");

class MasterService {
  // Get All Roles
  static async getAllRoles(): Promise<any> {
    try {
      // Get All Roles
      const roles = await Role.findAll({
        where: { deletedAt: null },
      });
      return {
        status: STATUS_CODES.SUCCESS,
        data: roles,
        message: "Roles fetched successfully",
      };
    } catch (error) {
      console.log(error);
      return {
        status: STATUS_CODES.SERVER_ERROR,
        message: STATUS_MESSAGE.ERROR_MESSAGE.INTERNAL_SERVER_ERROR,
      };
    }
  }

  // Get All Centers
  static async getAllCenters(): Promise<any> {
    try {
      // Assuming a method exists to fetch centers
      const centers = await Center.findAll({
        where: { deletedAt: null },
        order: [["center_name", "ASC"]] as Order,
      });
      return {
        status: STATUS_CODES.SUCCESS,
        data: centers,
        message: "Centers fetched successfully",
      };
    } catch (error) {
      console.log(error);
      return {
        status: STATUS_CODES.SERVER_ERROR,
        message: STATUS_MESSAGE.ERROR_MESSAGE.INTERNAL_SERVER_ERROR,
      };
    }
  }

  // Get All Methods
  static async getAllMethods(): Promise<any> {
    try {
      // Fetch all methods from the database
      const methods = await Methods.findAll({
        where: { deletedAt: null },
        order: [["name", "ASC"]] as Order,
      });
      return {
        status: STATUS_CODES.SUCCESS,
        data: methods,
        message: "Methods fetched successfully",
      };
    } catch (error) {
      console.log(error);
      return {
        status: STATUS_CODES.SERVER_ERROR,
        message: STATUS_MESSAGE.ERROR_MESSAGE.INTERNAL_SERVER_ERROR,
      };
    }
  }

  // Signed Off Qualification
  static async signedOff(data: any, userData: userAuthenticationData): Promise<any> {
    try {
      let userQualification = await UserQualification.findOne({
        where: { qualification_id: data.qualification_id, user_id: data.learner_id }
      })
      if (!userQualification) {
        return {
          status: STATUS_CODES.NOT_FOUND,
          message: "Qualification not found",
        };
      }
      await userQualification.update({ is_signed_off: true });
      return {
        status: STATUS_CODES.SUCCESS,
        data: null,
        message: "Qualification signed off successfully",
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

export default MasterService;
