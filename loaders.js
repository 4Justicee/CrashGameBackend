const fs = require("fs");
const express = require("express");
const session = require("express-session");
const path = require("path");
const mysql = require("mysql2/promise");
const database = require("./models");
const bodyParser = require("body-parser");
const compression = require("compression");
const cors = require("cors");
const router = require("./controllers/routers");
const config = require("./config/preference");
const { serverFunc } = require(`./controllers/crash`);
const { connectWebSocket } = require("./controllers/websocket");

exports.connectDb = async () => {
  try {
    try {
      const conn = await mysql.createConnection({
        host: config.database.host,
        user: config.database.user,
        password: config.database.pass,
        port: config.database.port,
      });

      console.log(`Database (${config.database.name}) creating...`);

      await conn.query("CREATE DATABASE `" + config.database.name + "` DEFAULT CHARACTER SET utf8 COLLATE utf8_general_ci;");
    } catch (error) {
      if (error.code == "ER_DB_CREATE_EXISTS") {
        console.log(`Database already exists.`);
      } else {
        console.log(`Database creating failed... ${error.message}`);
        process.exit(0);
      }
    }

    // synchronize
    await database.sync();  
    console.log("Connected successfully");
  } catch (error) {
    console.log(`Database connect failed... ${error.message}`);

    process.exit(1);
  }
};

exports.loadExpress = ({ app }) => {
  try {
    // static public
    app.use(express.static(path.join(__dirname, "./public")));

    // middlewares
    app.use(cors());
    app.use(bodyParser.json({ limit: "10mb" }));
    app.use(bodyParser.urlencoded({ limit: "10mb", extended: false }));
    app.use(bodyParser.text());
    app.use(compression());

    // session
    app.use(
      session({
        secret: config.secretKey,
        resave: false,
        saveUninitialized: false,
      })
    );

    // set routers
    app.use("/", router);

    console.log("Loaded successfully.");
  } catch (error) {
    console.log(`Express config failed... ${error.message}`);
    process.exit(0);
  }
};

exports.startServerFunc = async () => {
  await serverFunc();
};

exports.webSocket = async (io) => {
  connectWebSocket(io);
};
