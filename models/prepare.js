module.exports = (sequelize, Sequelize) => {  
  const Prepare = sequelize.define(  
    "Prepare",  // Model name as used in Sequelize references  
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
        // Consider using DECIMAL for monetary values if accurate calculations are critical  
        type: Sequelize.DOUBLE, // Adjust precision as needed for your use case  
        allowNull: false,  
        defaultValue: 0,  
      },  
      autoCashOut: {  
        // FLOAT is fine here assuming high precision is not critical for this value  
        type: Sequelize.FLOAT,  
        allowNull: false,  
        defaultValue: 0,  
      },      
    },  
    {  
      timestamps: true,  
      tableName: 'originals_crash_prepare',  // Custom table name with prefix for consistency  
    }  
  );  
  return Prepare;  
};  