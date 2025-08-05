import { Model, Sequelize } from "sequelize";
import { DataTypes } from "sequelize";
const { sequelize } = require("../../configs/database");
import { UserInterface } from "../../interface/user";
import BaseModel from "./base";
import { TABLE_NAME } from "../../configs/tables";
import Qualifications from "./qualifications";

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
  public about!: string;
  public trainee!: boolean;
  public date_of_birth!: string;
  public address!: string;
  public gender!: number;
  public learning_difficulties!: boolean;
  public off_the_job_training!: number;
  public entitlement_date!: string;
  public start_date!: string;
  public expected_end_date!: string;
  public employer!: string;
  public theme_color!: string; // Added theme_color field
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
    theme_color: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: "primary", // Default theme color
    },
    about: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    trainee: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
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
    date_of_birth: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    address: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    gender: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      comment: "1: male | 2: female | 3: Prefer not say",
    },
    learning_difficulties: {
      type: DataTypes.BOOLEAN, // Or BOOLEAN if just yes/no
      allowNull: true,
    },
    off_the_job_training: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 1,
      comment: "1: Yes | 2: no",
    },
    entitlement_date: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    start_date: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    expected_end_date: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    employer: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  { ...BaseModel.initBaseOptions(sequelize), tableName: TABLE_NAME.USER }
);

User.belongsToMany(Qualifications, {
  through: "tbl_user_qualification",
  foreignKey: "user_id",
  otherKey: "qualification_id",
  as: "qualifications",
});

User.findUserData = async (id) =>
  User.findOne({
    where: {
      id,
      deletedAt: null,
    },
  });

export default User;
