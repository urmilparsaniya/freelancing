'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    /**
     * Add altering commands here.
     *
     * Example:
     * await queryInterface.createTable('users', { id: Sequelize.INTEGER });
     */
    await queryInterface.addColumn("tbl_assessment", "assessment_status", {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment:
        "1: create | 2: learner agreed | 3: assessor reject | 4: completed",
      defaultValue: 1
    });
  },

  async down (queryInterface, Sequelize) {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
    await queryInterface.removeColumn("tbl_assessment", "assessment_status");
  }
};
