import { Model, Sequelize } from "sequelize";
import { DataTypes } from "sequelize";
const { sequelize } = require("../../configs/database");
import { UserInterface } from "../../interface/user";
import BaseModel from "./base";
import { TABLE_NAME } from "../../configs/tables";

class User extends Model<UserInterface> implements UserInterface {
  public id!: number;
  public name!: string;
  public surname!: string;
  public login_token?: string;
  public phone_number?: string;
  public phone_code?: string;
  public email!: string;
  public role!: number;
  public password!: string;
  // timestamps!
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public deletedAt?: Date;
  static findUserData: (id: number) => Promise<UserInterface | null>;
}

User.init(
  {
    ...BaseModel.initBaseModel(sequelize),
    name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    surname: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    login_token: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    phone_number: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    phone_code: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isEmail: true,
      },
    },
    role: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1, // Super Admin: 1, Teacher: 2, Learner: 3, Observer: 4
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
      set(value: string) {
        // Hash the password before saving it
        const hashedPassword = require("bcrypt").hashSync(value, 10);
        this.setDataValue("password", hashedPassword);
      },
    },
  },
  { ...BaseModel.initBaseOptions(sequelize), tableName: TABLE_NAME.USER }
);

User.findUserData = async (id) => 
  User.findOne({
    where: {
      id,
      deletedAt: null,
    },
  });

export default User;