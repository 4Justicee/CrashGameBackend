module.exports = (sequelize, Sequelize) => {  
  const RoundInfo = sequelize.define(  
    "RoundInfo", // Model reference name used in code  
    {  
      id: {  
        type: Sequelize.INTEGER,  
        primaryKey: true,  
        autoIncrement: true,  
      },  
      user_id: {  
        type: Sequelize.INTEGER, // Using SMALLINT instead of TINYINT (PostgreSQL doesn't have TINYINT)  
        allowNull: false,  
        defaultValue: 0, // 0-preparing, 1-Running, 2-Finished.  
      },  
      user_seed : {  
        type: Sequelize.STRING, // Consider changing to a numeric type if these represent numeric values  
        allowNull: false,  
        defaultValue: '',  
      },  
      nonce : {  
        type: Sequelize.INTEGER, // Consider changing to a numeric type if these represent numeric values  
        allowNull: false,  
        defaultValue: 0,  
      },  
      server_seed: {  
        type: Sequelize.STRING, // Consider changing to a numeric type if these represent numeric values  
        allowNull: false,  
        defaultValue: '',  
      },  
      hash: {  
        type: Sequelize.STRING, // Consider changing to a numeric type if these represent numeric values  
        allowNull: false,  
        defaultValue: '',  
      },  
      bet_amount: {  
        type: Sequelize.FLOAT, // Same consideration for numeric type  
        allowNull: false,  
        defaultValue: 0.0,  
      },  
      currency: {  
        type: Sequelize.STRING, // Same consideration for numeric type  
        allowNull: false,  
        defaultValue: 'BTC',  
      },
      risk: {  
        type: Sequelize.SMALLINT, // Same consideration for numeric type  
        allowNull: false,  
        defaultValue: 0,  
      },
      rows: {  
        type: Sequelize.SMALLINT, // Same consideration for numeric type  
        allowNull: false,  
        defaultValue: 8,  
      },
      path: {  
        type: Sequelize.STRING, // Same consideration for numeric type  
        allowNull: false,  
        defaultValue: '',  
      },
      multiplier: {  
        type: Sequelize.FLOAT, // Same consideration for numeric type  
        allowNull: false,  
        defaultValue: 0.0,  
      },  
      win: {  
        type: Sequelize.FLOAT, // Same consideration for numeric type  
        allowNull: false,  
        defaultValue: 0.0,  
      },  
    },  
    {  
      timestamps: true,  
      tableName: 'originals_plinko_info', // Prefixing the table name as per your requirement  
    }  
  );  
  RoundInfo.eraseAll = async () => {
    await RoundInfo.destroy({ truncate: true });
  }
  return RoundInfo;  
};  