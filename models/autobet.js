const queryString = require("querystring");

module.exports = (sequelize, Sequelize) => {
  const AutoBet = sequelize.define(
    "autobet",
    {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      currency: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: '',
      },
      betAmount: {
        type: Sequelize.FLOAT,
        allowNull: false,
        defaultValue: 0,
      },
      autoCashOut: {
        type: Sequelize.FLOAT,
        allowNull: false,
        defaultValue: 0,
      },    
      autoCount: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
    },
    {
      timestamps: true,
    }
  );

  return AutoBet;
};
