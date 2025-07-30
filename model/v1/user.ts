require("dotenv").config();
import { STATUS_CODES, STATUS_MESSAGE } from "../../configs/constants";
import { compare } from "bcrypt";
import jwt from "jsonwebtoken";
import { AuthResponse, UserInterface } from "../../interface/user";
import User from "../../database/schema/user";
const jwtSecret = process.env.JWT_SECRET || "";
const AccessTokenExpiration = process.env.ACCESS_TOKEN_EXPIRATION || "";

class userAuthService {
  // Login method for user authentication
  static async userAuth(data: UserInterface): Promise<AuthResponse> {
    // check is valid customer
    let isUser = await User.findOne({
      where: {
        email: data.email,
        deletedAt: null,
      },
    });
    if (!isUser) {
      return {
        status: STATUS_CODES.NOT_FOUND,
        message: STATUS_MESSAGE.USER.ERROR_MESSAGE.USER_NOT_FOUND,
      };
    }
    // check password
    let password = await compare(data.password, isUser.password);
    if (!password) {
      return {
        status: STATUS_CODES.UNAUTHORIZED,
        message: STATUS_MESSAGE.USER.ERROR_MESSAGE.INVALID_CREDENTIAL,
      };
    }
    // login token generate
    const loginToken = await jwt.sign({ id: isUser.id }, jwtSecret, {
      expiresIn: AccessTokenExpiration,
    });
    // update customer
    await User.update(
      { login_token: loginToken },
      { where: { id: isUser.id } }
    );
    isUser.login_token = loginToken;
    return {
      data: isUser,
      status: STATUS_CODES.SUCCESS,
      message: STATUS_MESSAGE.USER.USER_LOGIN,
    };
  }
}

export default userAuthService;
