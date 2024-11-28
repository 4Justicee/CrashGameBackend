const { isEmpty } = require("../utils/empty");
module.exports = (sequelize, Sequelize) => {
  const Balance = sequelize.define(
    "balance",
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
        defaultValue: "",
      },
      balance: {
        type: Sequelize.DOUBLE(50, 2),
        allowNull: false,
        defaultValue: 0,
      },
      realRtp: {
        type: Sequelize.FLOAT,
        allowNull: false,
        defaultValue: '0.0',
      },
      targetRtp: {
        type: Sequelize.FLOAT,
        allowNull: false,
        defaultValue: '80',
      },
      totalDebit: {
        type: Sequelize.FLOAT,
        allowNull: false,
        defaultValue: '0.0',
      },
      totalCredit: {
        type: Sequelize.FLOAT,
        allowNull: false,
        defaultValue: '0.0',
      },      
    },
    {
      timestamps: true,
      indexes: [ // Define indexes in the model options  
        {  
          fields: ['user_id'], // Indexes the user_id field  
        },  
      ],
    }
  );

  Balance.prototype.setBalance = async function (debit, credit) {
    let rtp = this.targetRtp;
    let d = this.totalDebit;
    let c = this.totalCredit;

    this.balance = (Number)(this.balance) - (Number)(debit) + (Number)(credit);  
    d = (Number)(d) + (Number)(debit);
    c = (Number)(c) + (Number)(credit);
    rtp = (Number)(d) == 0 ? 0 : ((Number)(c) / (Number)(d) * 100).toFixed(2)

    this.targetRtps = rtp;
    this.totalCredits = c;
    this.totalDebits = d;

    await this.save();
  };

  return Balance;
};
