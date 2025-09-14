import { Model, Sequelize } from "sequelize";
import { DataTypes } from "sequelize";
const { sequelize } = require("../../configs/database");
import BaseModel from "./base";
import { TABLE_NAME } from "../../configs/tables";
import { ModuleRecordsInterface } from "../../interface/modules_records";
import Image from "./images";
import { Entity } from "../../configs/constants";

class ModuleRecords
  extends Model<ModuleRecordsInterface>
  implements ModuleRecordsInterface
{
  public id!: number;
  public module_type: number;
  public title: string;
  public date: string;
  public center_id: number;
  public created_by: number;
  public status!: number;
  // timestamps!
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public deletedAt?: Date;
}

ModuleRecords.init(
  {
    ...BaseModel.initBaseModel(sequelize),
    module_type: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    date: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    center_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    status: {
      type: DataTypes.INTEGER,
      comment: "1: Active, 2: Inactive",
      defaultValue: 1,
    },
  },
  {
    ...BaseModel.initBaseOptions(sequelize),
    tableName: TABLE_NAME.MODULE_RECORDS,
  }
);

ModuleRecords.hasMany(Image, {
    foreignKey: "entity_id",
    as: "images_module_records",
    scope: {
      entity_type: Entity.MODULE_RECORDS
    }
})

export default ModuleRecords