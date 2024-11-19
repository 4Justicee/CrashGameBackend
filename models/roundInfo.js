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
      autoBetUserList: {
        type: Sequelize.TEXT("long"),
        get() {
          const val = this.getDataValue("autoBetUserList");
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
    // Load current data from the database to make sure it's up to date  
    await this.reload();  
    
    let list = []; // Initialize empty array   
  
    // Check the type and parse the current data  
    if (['betUserList', 'cashOutUserList', 'autoBetUserList'].includes(type)) {  
      const currentData = this.getDataValue(type);  
      if (currentData) { // If there's any existing data parse it  
        list = JSON.parse(currentData);  
      }  
      list.push(obj); // Add the new object to the list  
  
      // Update the field with new array after converting it back to string  
      this.setDataValue(type, JSON.stringify(list));  
  
      // Call save() to update the model in the database  
      await this.save();  
    } else {  
      throw new Error("Invalid user list type");  
    }  
  };  


  return RoundInfo;
};
