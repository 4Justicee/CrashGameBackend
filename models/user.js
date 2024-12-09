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
      user_code: {
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
      tableName: 'originals_plinko_user', // Prefixing the table name as per your requirement  
    }
  );


  return User;
};
