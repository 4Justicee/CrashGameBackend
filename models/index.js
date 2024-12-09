const Sequelize = require("sequelize");  
const config = require("../config/preference");  

const realConnectString = `postgres://${config.database.user}:${config.database.pass}@${config.database.host}:${config.database.port}/${config.database.name}`;

const sequelize = new Sequelize(  
  realConnectString,  
  {  
    dialect: 'postgres',  // Changed from MySQL or other to PostgreSQL  
    port: config.database.port,  
    logging: config.database.logging,  
    timezone: "+08:00",  
    pool: {  
      max: 1000,  
      min: 0,  
      acquire: 60000,  
      idle: 30000,  
    },  
  }  
);  

const db = {};  

db.User = require("./user")(sequelize, Sequelize);  
db.RoundInfo = require("./roundInfo")(sequelize, Sequelize);  
db.Balance = require("./balance")(sequelize, Sequelize);  


db.Sequelize = Sequelize;  
db.sequelize = sequelize;  

db.sync = async () => {  
  await db.sequelize.sync();  


  await db["RoundInfo"].eraseAll();

  const associatePromises = Object.keys(db).map((modelName) => {  
    if (db[modelName].associate) {  
      return db[modelName].associate(db);  
    }  
    return null; // Added to avoid possible undefined returns in-map  
  });  

  await Promise.all(associatePromises);  
  if (db["Transaction"] && db["Transaction"].migrate) {  
    await db["Transaction"].migrate();  
  }  
};  

module.exports = db;  