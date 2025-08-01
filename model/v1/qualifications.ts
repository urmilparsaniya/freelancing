require("dotenv").config();
import { userAuthenticationData } from "../../interface/user";
import { STATUS_CODES, STATUS_MESSAGE } from "../../configs/constants";
import XLSX from "xlsx";
import Qualifications from "../../database/schema/qualifications";
import Units from "../../database/schema/units";
import SubOutcomes from "../../database/schema/sub_outcomes";
import OutcomeSubpoints from "../../database/schema/outcome_subpoints";
const { sequelize } = require("../../configs/database");

class qualificationService {
  // Create qualification method
  static async createQualification(
    data,
    userData: userAuthenticationData,
    file
  ): Promise<any> {
    const transaction = await sequelize.transaction();
    try {
      const workbook = XLSX.read(file.buffer, { type: "buffer" });
      // Qualification data processing logic goes here
      const sheetName = workbook.SheetNames[0]; // This is a string like "Sheet1"
      const firstSheet = workbook.Sheets[sheetName]; // This gets the actual sheet object
      // Extract values from specific cells
      const qualificationName = firstSheet["B1"]?.v?.toString().trim() || "";
      const qualificationNumber = firstSheet["B2"]?.v?.toString().trim() || "";
      // Validate extracted data
      if (!qualificationName || !qualificationNumber) {
        return {
          status: STATUS_CODES.BAD_REQUEST,
          message: "Qualification name or number is missing in the Excel file.",
        };
      }
      const qualificationData = await Qualifications.create(
        {
          name: qualificationName,
          qualification_no: qualificationNumber,
          created_by: userData.id,
        },
        { transaction }
      );
      // Unit Data processing logic
      for (const sheetName of workbook.SheetNames) {
        if (!sheetName.toLowerCase().startsWith("unit")) continue;
        // Process each unit sheet
        const sheet = workbook.Sheets[sheetName];
        const unitNo = sheet["B1"]?.v?.toString().trim() || "";
        const unitName = sheet["B2"]?.v?.toString().trim() || "";
        const unitRefNo = sheet["B3"]?.v?.toString().trim() || "";
        // create unit
        let unitData = await Units.create(
          {
            qualification_id: qualificationData.id,
            unit_title: unitName,
            unit_number: unitNo,
            unit_ref_no: unitRefNo,
            created_by: userData.id,
          },
          { transaction }
        );
        // Extract sub outcome data
        const range = XLSX.utils.decode_range(sheet["!ref"] || "");
        let currentSubOutcomeId: number | null = null;
        for (let row = 4; row <= range.e.r; row++) {
          const codeCell = sheet[XLSX.utils.encode_cell({ c: 0, r: row })];
          const descCell = sheet[XLSX.utils.encode_cell({ c: 1, r: row })];

          const code = codeCell?.v?.toString().trim();
          const description = descCell?.v?.toString().trim();

          if (code && /^[0-9]+\.[0-9]+$/.test(code)) {
            // Create SubOutcome
            const subOutCome = await SubOutcomes.create(
              {
                unit_id: unitData.id,
                qualification_id: qualificationData.id,
                description: description || "",
                outcome_number: code,
                created_by: userData.id,
              },
              { transaction }
            );
            currentSubOutcomeId = subOutCome.id;
          } else if (currentSubOutcomeId && !code && description) {
            const cleanedDescription = description
              .replace(/^[•●▪‣◦¤··\-–—*·\u2022\u2023\u25AA\s]+/, "")
              .trim();
            // Create SubPoints
            await OutcomeSubpoints.create(
              {
                outcome_id: currentSubOutcomeId,
                point_text: cleanedDescription,
                created_by: userData.id,
              },
              { transaction }
            );
          }
        }
      }
      // Commit transaction
      await transaction.commit();
      return {
        status: STATUS_CODES.SUCCESS,
        data: qualificationData,
        message: "Qualification created successfully.",
      };
    } catch (error) {
      console.error("Error creating qualification:", error);
      // Rollback transaction in case of error
      await transaction.rollback();
      return {
        status: STATUS_CODES.SERVER_ERROR,
        message: STATUS_MESSAGE.ERROR_MESSAGE.INTERNAL_SERVER_ERROR,
      };
    }
  }

  // Get qualifications method
  static async getQualifications(
    qualificationId: number | string,
    userData: userAuthenticationData
  ): Promise<any> {
    try {
      const units = await Units.findAll({
        where: { qualification_id: qualificationId },
        include: [
          {
            model: SubOutcomes,
            as: "subOutcomes",
            include: [
              {
                model: OutcomeSubpoints,
                as: "outcomeSubpoints",
              },
            ],
            order: [["outcome_number", "ASC"]],
          },
        ],
        order: [["unit_number", "ASC"]],
      });

      const result = {
        units: [],
      };

      for (const unit of units) {
        const sectionsMap = new Map(); // sectionNumber => sectionData
        //@ts-ignore
        for (const outcome of unit.subOutcomes || []) {
          const [sectionNumber, outcomeNumber] =
            outcome.outcome_number.split(".");

          const paddedSection = sectionNumber.padStart(2, "0");
          const paddedOutcome = outcomeNumber.padStart(2, "0");

          if (!sectionsMap.has(paddedSection)) {
            sectionsMap.set(paddedSection, {
              sectionNumber: paddedSection,
              title: "", // Optional: Extract section title from description logic
              outcomes: [],
            });
          }

          const outcomeEntry: any = {
            number: `${paddedSection}.${paddedOutcome}`,
            description: outcome.description,
          };

          if (outcome.outcomeSubpoints && outcome.outcomeSubpoints.length) {
            outcomeEntry.subPoints = outcome.outcomeSubpoints.map(
              (p) => p.point_text
            );
          }

          sectionsMap.get(paddedSection).outcomes.push(outcomeEntry);
        }

        result.units.push({
          unitTitle: unit.unit_title,
          unitNumber: unit.unit_number,
          sections: Array.from(sectionsMap.values()),
        });
      }

      return {
        status: STATUS_CODES.SUCCESS,
        data: result,
        message: "Qualifications retrieved successfully.",
      };
    } catch (error) {
      console.error("Error retrieving qualifications:", error);
      return {
        status: STATUS_CODES.SERVER_ERROR,
        message: STATUS_MESSAGE.ERROR_MESSAGE.INTERNAL_SERVER_ERROR,
      };
    }
  }
}

export default qualificationService;
