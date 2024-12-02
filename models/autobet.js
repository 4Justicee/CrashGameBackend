module.exports = (sequelize, Sequelize) => {  
  const AutoBet = sequelize.define(  
    "AutoBet",  // This is the name of the model. It's used internally in Sequelize.  
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
      tableName: 'originals_crash_autobet'  // Custom table name with prefix  
    }  
  );  

  return AutoBet;  
};  