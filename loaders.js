const fs = require("fs");
const express = require("express");
const session = require("express-session");
const path = require("path");
const { Pool } = require("pg");  // Changed from mysql2 to pg 
const database = require("./models");
const bodyParser = require("body-parser");
const compression = require("compression");
const cors = require("cors");
const router = require("./controllers/routers");
const config = require("./config/preference");
const { serverFunc, scheduleRemoveOldRecords } = require(`./controllers/crash`);
const { connectWebSocket } = require("./controllers/websocket");

exports.connectDb = async () => {  
  try {  
    const pool = new Pool({  
      connectionString: config.database.url
    });  

    const client = await pool.connect();  
    try {  
      console.log(`Database (${config.database.name}) creating...`);  

      //await client.query(`CREATE DATABASE "${config.database.name}"`);  
    } catch (error) {  
      if (error.code === '42P04') {  // 42P04 is the code for "database already exists"  
        console.log(`Database already exists.`);  
      } else {  
        console.log(`Database creation failed... ${error.message}`);  
        process.exit(0);  
      }  
    } finally {  
      client.release();  
    }  

    console.log("Please wait while transaction hash generating", Date.now());  
    // Synchronize  
    await database.sync();  
    console.log("Hash table exist or finished.", Date.now());  

    console.log("Connected successfully to PostgreSQL.");  
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
  scheduleRemoveOldRecords();
  await serverFunc();
};

exports.webSocket = async () => {
  connectWebSocket();
};
