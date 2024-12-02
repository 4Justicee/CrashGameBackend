module.exports = (sequelize, Sequelize) => {  
  const RoundInfo = sequelize.define(  
    "RoundInfo", // Model reference name used in code  
    {  
      id: {  
        type: Sequelize.INTEGER,  
        primaryKey: true,  
        autoIncrement: true,  
      },  
      roundState: {  
        type: Sequelize.SMALLINT, // Using SMALLINT instead of TINYINT (PostgreSQL doesn't have TINYINT)  
        allowNull: false,  
        defaultValue: 0, // 0-preparing, 1-Running, 2-Finished.  
      },  
      betUserList: {  
        type: Sequelize.JSON, // Using JSON type which is supported by PostgreSQL  
        get() {
          const val = this.getDataValue("betUserList");
          return JSON.parse(val);
        },
      },  
      cashOutUserList: {  
        type: Sequelize.JSON, // Using JSON type for better performance and native support  
        get() {
          const val = this.getDataValue("cashOutUserList");
          return JSON.parse(val);
        },
      },  
      roundTotalDebits: {  
        type: Sequelize.STRING, // Consider changing to a numeric type if these represent numeric values  
        allowNull: false,  
        defaultValue: '0,0',  
      },  
      roundTotalCredits: {  
        type: Sequelize.STRING, // Same consideration for numeric type  
        allowNull: false,  
        defaultValue: '0,0',  
      },  
      roundRtps: {  
        type: Sequelize.STRING, // Same consideration for numeric type  
        allowNull: false,  
        defaultValue: '0,0',  
      },  
    },  
    {  
      timestamps: true,  
      tableName: 'originals_crash_info', // Prefixing the table name as per your requirement  
    }  
  );  

  RoundInfo.prototype.addUserData = async function (type, obj) {  
    await this.reload();   
    let list = [];   
    if (['betUserList', 'cashOutUserList'].includes(type)) {  
      let currentData = this.getDataValue(type) || [];  
      list = [...currentData, obj]; // Simplifying the usage by leveraging the JSON type directly  
      this.setDataValue(type, list);  
      await this.save();  
    } else {  
      throw new Error("Invalid user list type");  
    }  
  };  

  return RoundInfo;  
};  