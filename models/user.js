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
      },
      btcbalance: {
        type: Sequelize.DOUBLE(50, 2),
        allowNull: false,
        defaultValue: 0,
      },
      ethbalance: {
        type: Sequelize.DOUBLE(50, 2),
        allowNull: false,
        defaultValue: 0,
      },
      realRtps: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: '0,0',
      },
      targetRtps: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: '80,80',
      },
      totalDebits: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: '0,0',
      },
      totalCredits: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: '0,0',
      },      
    },
    {
      timestamps: true,
    }
  );

  User.prototype.setBalance = async function (debit, credit,currency) {
    const rtps = this.targetRtps.split(",");
    const debits = this.totalDebits.split(",");
    const credits = this.totalCredits.split(",");

    if(currency.toUpperCase() == 'ETH') {
      this.ethbalance = (Number)(this.ethbalance) - (Number)(debit) + (Number)(credit);  
      debits[0] = (Number)(debits[0]) + (Number)(debit);
      credits[0] = (Number)(credits[0]) + (Number)(credit);
      rtps[0] = (Number)(debit[0]) == 0 ? 0 : ((Number)(credits[0]) / (Number)(debits[0]) * 100).toFixed(2)
    }
    else {
      this.btcbalance = (Number)(this.btcbalance) - (Number)(debit) + (Number)(credit);  
      debits[1] = (Number)(debits[1]) + (Number)(debit);
      credits[1] = (Number)(credits[1]) + (Number)(credit);
      rtps[1] = (Number)(debit[1]) == 0 ? 0 : ((Number)(credits[1]) / (Number)(debits[1]) * 100).toFixed(2)
    }

    this.targetRtps = rtps.join();
    this.totalCredits = credits.join();
    this.totalDebits = debits.join();
    await this.save();
  };

  return User;
};
