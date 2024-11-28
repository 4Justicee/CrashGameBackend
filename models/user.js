const { isEmpty } = require("../utils/empty");
module.exports = (sequelize, Sequelize) => {
  const User = sequelize.define(
    "user",
    {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      userCode: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: "",
      },
      token: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: "",
      }
    },
    {
      timestamps: true,
    }
  );


  return User;
};
