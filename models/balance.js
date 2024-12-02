module.exports = (sequelize, Sequelize) => {
  const Balance = sequelize.define(  
    "Balance",  // Naming the model "Balance" to use it in code  
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
      balance: {  // Changed the name to avoid confusion with the model name  
        type: Sequelize.DOUBLE,  // Using DECIMAL for monetary values  
        allowNull: false,  
        defaultValue: 0,  
      },  
      realRtp: {  
        type: Sequelize.FLOAT,  
        allowNull: false,  
        defaultValue: 0.0,  
      },  
      targetRtp: {  
        type: Sequelize.FLOAT,  
        allowNull: false,  
        defaultValue: 80.0,  
      },  
      totalDebit: {  
        type: Sequelize.FLOAT,  
        allowNull: false,  
        defaultValue: 0.0,  
      },  
      totalCredit: {  
        type: Sequelize.FLOAT,  
        allowNull: false,  
        defaultValue: 0.0,  
      },  
    },  
    {  
      timestamps: true,  
      tableName: 'originals_crash_balance',  // Custom table name with prefix  
      indexes: [  // Optimizing user_id lookup  
        {  
          fields: ['user_id'],   
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
