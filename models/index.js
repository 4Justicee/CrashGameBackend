const Sequelize = require("sequelize");
const config = require("../config/preference");

const sequelize = new Sequelize(config.database.name, config.database.user, config.database.pass, {
  host: config.database.host,
  dialect: config.database.type,
  port: config.database.port,
  logging: config.database.logging,
  timezone: "+08:00",
  pool: {
    max: 1000,
    min: 0,
    acquire: 60000,
    idle: 30000,
  },
});

const db = {};

db.User = require("./user")(sequelize, Sequelize);
db.RoundInfo = require("./roundInfo")(sequelize, Sequelize);
db.Prepare = require("./prepare")(sequelize, Sequelize);
db.Transaction = require("./transaction")(sequelize, Sequelize);
db.Balance = require("./balance")(sequelize, Sequelize);
db.AutoBet = require("./autobet")(sequelize, Sequelize);

db.Sequelize = Sequelize;
db.sequelize = sequelize;

db.sync = async () => {
  await db.sequelize.sync();

  const associatePromises = Object.keys(db).map((modelName) => {
    if (db[modelName].associate) {
      return db[modelName].associate(db);
    }
  });

  await Promise.all(associatePromises);
  await db["Transaction"].migrate();
};

module.exports = db;
