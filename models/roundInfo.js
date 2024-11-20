const queryString = require("querystring");

module.exports = (sequelize, Sequelize) => {
  const RoundInfo = sequelize.define(
    "roundInfo",
    {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      roundIndex: {
        type: Sequelize.DOUBLE(50, 2),
        allowNull: false,
        defaultValue: 0,
      },
      roundState: {
        type: Sequelize.TINYINT,
        allowNull: false,
        defaultValue: 0, //0-preparing, 1-Running, 2-Finished.
      },
      betUserList: {
        type: Sequelize.TEXT("long"),
        get() {
          const val = this.getDataValue("betUserList");
          return JSON.parse(val);
        },
      
      },
      cashOutUserList: {
        type: Sequelize.TEXT("long"),
        get() {
          const val = this.getDataValue("cashOutUserList");
          return JSON.parse(val);
        },
      },      
      roundMaxMulti: {
        type: Sequelize.DOUBLE(50, 2),
        allowNull: false,
        defaultValue: 0,
      },
      roundTotalDebits: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: '0,0',
      },
      roundTotalCredits: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: '0,0',
      },
      roundRtps: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: '0,0',
      },
      nounce: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: '',
      },
      secretKey: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: '',
      },
    },
    {
      timestamps: true,
    }
  );

  RoundInfo.prototype.addUserData = async function (type, obj) {  
    await this.reload();  
    
    let list = []; 
    if (['betUserList', 'cashOutUserList'].includes(type)) {  
      const currentData = this.getDataValue(type);  
      if (currentData) { 
        list = JSON.parse(currentData);  
      }  
      list.push(obj); 
      this.setDataValue(type, JSON.stringify(list));  
      await this.save();  
    } else {  
      throw new Error("Invalid user list type");  
    }  
  };  


  return RoundInfo;
};
