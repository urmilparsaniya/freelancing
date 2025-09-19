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
import Assessment from "../../database/schema/assessment";
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
      // Check if user has do already signed Off throw an error
      if (userQualification.is_signed_off && data.is_sign_off == 1) {
        return {
          status: STATUS_CODES.BAD_REQUEST,
          message: "Qualification already signed off",
        };
      }
      await userQualification.update({ is_signed_off: data.is_sign_off });
      let learner_ = await User.findOne({
        where: { id: data.learner_id, deletedAt: null },
        include: [
          {
            model: Qualifications,
            as: "qualifications",
            required: false,
            through: { attributes: [ "is_signed_off" ] }, // prevent including join table info
          },
          {
            model: User,
            as: "assessors",
            required: false,
            through: { attributes: [] },
          },
          {
            model: User,
            as: "iqas",
            required: false,
            through: { attributes: [] },
          },
          {
            model: Center,
            as: "center",
            required: false,
            attributes: ["id", "center_name", "center_address"],
          },
        ],
      });
      learner_ = JSON.parse(JSON.stringify(learner_));
      //@ts-ignore
      if (learner_ && learner_.qualifications?.length) {
        //@ts-ignore
        learner_.qualifications = await Promise.all(
          //@ts-ignore
          learner_.qualifications.map(async (q: any) => {
            const { tbl_user_qualification, UserQualification, ...rest } = q; // strip join table objects
            return {
              ...rest,
              is_signed_off:
                tbl_user_qualification?.is_signed_off ??
                UserQualification?.is_signed_off ??
                null,
            };
          })
        );
      } 
      return {
        status: STATUS_CODES.SUCCESS,
        data: learner_,
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

  // Get Dashboard method
  static async getDashboard(data: any, userData: userAuthenticationData): Promise<any> {
    try {
      // Check if user is admin (role = 1), if not, return empty response
      if (userData.role !== 7) {
        return {
          status: STATUS_CODES.SUCCESS,
          message: STATUS_MESSAGE.DASHBOARD.DASHBOARD_DATA,
          data: {
            overview: {
              totalLearners: 0,
              activeAssessors: 0,
              iqasSupervising: 0,
              qualifications: 0,
              totalAssessments: 0,
              completed: 0,
              pendingReview: 0,
              successRate: 0
            },
            monthlyOverview: [],
            statusDistribution: [],
            recentActivity: []
          }
        };
      }

      const { Op } = require('sequelize');
      const currentDate = new Date();
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(currentDate.getMonth() - 6);

      // Get all required data in parallel
      const [
        totalLearners,
        activeAssessors,
        iqasSupervising,
        qualifications,
        totalAssessments,
        completedAssessments,
        pendingReviewAssessments,
        monthlyData,
        statusDistribution,
        recentActivity
      ] = await Promise.all([
        // Total Learners (role = 3)
        User.count({
          where: { 
            role: 3,
            deletedAt: null 
          }
        }),

        // Active Assessors (role = 2)
        User.count({
          where: { 
            role: 2,
            deletedAt: null 
          }
        }),

        // IQAs Supervising (role = 4 or specific IQA role)
        User.count({
          where: { 
            role: 4,
            deletedAt: null 
          }
        }),

        // Total Qualifications
        Qualifications.count({
          where: { 
            deletedAt: null,
            status: 1
          }
        }),

        // Total Assessments
        Assessment.count({
          where: { 
            deletedAt: null 
          }
        }),

        // Completed Assessments (assessment_status = 4)
        Assessment.count({
          where: { 
            assessment_status: 4,
            deletedAt: null 
          }
        }),

        // Pending Review Assessments (assessment_status = 2 or 5)
        Assessment.count({
          where: { 
            assessment_status: { [Op.in]: [2, 5] },
            deletedAt: null 
          }
        }),

        // Monthly Assessment Overview (last 6 months)
        Assessment.findAll({
          attributes: [
            [sequelize.fn('DATE_FORMAT', sequelize.col('createdAt'), '%Y-%m'), 'month'],
            [sequelize.fn('COUNT', sequelize.col('id')), 'submissions'],
            [sequelize.fn('COUNT', sequelize.literal('CASE WHEN assessment_status = 4 THEN 1 END')), 'completions']
          ],
          where: {
            createdAt: {
              [Op.gte]: sixMonthsAgo
            },
            deletedAt: null
          },
          group: [sequelize.fn('DATE_FORMAT', sequelize.col('createdAt'), '%Y-%m')],
          order: [[sequelize.fn('DATE_FORMAT', sequelize.col('createdAt'), '%Y-%m'), 'ASC']],
          raw: true
        }),

        // Assessment Status Distribution
        Assessment.findAll({
          attributes: [
            'assessment_status',
            [sequelize.fn('COUNT', sequelize.col('id')), 'count']
          ],
          where: {
            deletedAt: null
          },
          group: ['assessment_status'],
          raw: true
        }),

        // Recent Activity (last 10 activities)
        Assessment.findAll({
          attributes: ['id', 'title', 'assessment_status', 'createdAt', 'assessor_id'],
          include: [
            {
              model: User,
              as: 'assessor',
              attributes: ['id', 'name', 'surname'],
              required: false
            }
          ],
          where: {
            deletedAt: null
          },
          order: [['createdAt', 'DESC']],
          limit: 10
        })
      ]);

      // Calculate success rate
      const successRate = totalAssessments > 0 ? ((completedAssessments / totalAssessments) * 100).toFixed(1) : 0;

      // Process monthly data
      const monthlyOverview = [];
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const monthData = monthlyData.find((m: any) => m.month === monthKey) as any;
        
        monthlyOverview.push({
          month: monthNames[date.getMonth()],
          submissions: monthData ? parseInt(monthData.submissions) : 0,
          completions: monthData ? parseInt(monthData.completions) : 0
        });
      }

      // Process status distribution
      const statusMap = {
        1: { label: 'Created', color: '#3B82F6' },
        2: { label: 'Evidence Submitted', color: '#3B82F6' },
        3: { label: 'Under Review', color: '#F59E0B' },
        4: { label: 'Completed', color: '#10B981' },
        5: { label: 'With IQA', color: '#8B5CF6' },
        6: { label: 'IQA Approved', color: '#10B981' }
      };

      const processedStatusDistribution = statusDistribution.map((item: any) => ({
        status: statusMap[item.assessment_status]?.label || 'Unknown',
        count: parseInt(item.count),
        color: statusMap[item.assessment_status]?.color || '#6B7280'
      }));

      // Process recent activity
      const processedRecentActivity = recentActivity.map((activity: any) => {
        const timeAgo = this.getTimeAgo(activity.createdAt);
        const statusText = statusMap[activity.assessment_status]?.label || 'Unknown';
        
        return {
          id: activity.id,
          title: activity.title,
          user: activity.assessor ? `${activity.assessor.name} ${activity.assessor.surname}` : 'Unknown User',
          action: this.getActivityAction(activity.assessment_status),
          timeAgo: timeAgo,
          status: statusText,
          statusColor: statusMap[activity.assessment_status]?.color || '#6B7280'
        };
      });

      return {
        status: STATUS_CODES.SUCCESS,
        message: STATUS_MESSAGE.DASHBOARD.DASHBOARD_DATA,
        data: {
          overview: {
            totalLearners: totalLearners,
            activeAssessors: activeAssessors,
            iqasSupervising: iqasSupervising,
            qualifications: qualifications,
            totalAssessments: totalAssessments,
            completed: completedAssessments,
            pendingReview: pendingReviewAssessments,
            successRate: parseFloat(successRate.toString())
          },
          monthlyOverview: monthlyOverview,
          statusDistribution: processedStatusDistribution,
          recentActivity: processedRecentActivity
        }
      };

    } catch (error) {
      console.log(error);
      return {
        status: STATUS_CODES.SERVER_ERROR,
        message: STATUS_MESSAGE.ERROR_MESSAGE.INTERNAL_SERVER_ERROR,
      };
    }
  }

  // Helper method to calculate time ago
  private static getTimeAgo(date: Date): string {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - new Date(date).getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} days ago`;
    return `${Math.floor(diffInSeconds / 2592000)} months ago`;
  }

  // Helper method to get activity action text
  private static getActivityAction(status: number): string {
    const actionMap = {
      1: 'created',
      2: 'submitted evidence for',
      3: 'rejected',
      4: 'completed review of',
      5: 'submitted for IQA review',
      6: 'approved by IQA'
    };
    return actionMap[status] || 'updated';
  }
}

export default MasterService;
