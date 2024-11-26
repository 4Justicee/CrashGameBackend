const dotenv = require("dotenv");
const fs = require("fs");
if (!fs.existsSync("./.env")) {
  fs.copyFileSync("./.env.example", "./.env");
}
dotenv.config();

module.exports = {
  port: process.env.PORT,
  gamePort: process.env.GAME_PORT,

  database: {
    type: process.env.DB_TYPE,
    host: process.env.DB_HOST,
    name: process.env.DB_NAME,
    user: process.env.DB_USER,
    port: parseInt(process.env.DB_PORT),
    pass: process.env.DB_PASS,
  },

  secretKey: process.env.SECRET_KEY,
  waitTime: process.env.WAIT_TIME,
  rtp: process.env.rtp,
  max_turns: process.env.MAX_TURNS
};
