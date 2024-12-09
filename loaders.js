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
const { scheduleRemoveOldRecords } = require(`./controllers/plinko`);
const { connectWebSocket } = require("./controllers/websocket");


exports.connectDb = async () => {     
  const defaultConnectString = `postgres://${config.database.user}:${config.database.pass}@${config.database.host}:${config.database.port}/postgres`;
  const realConnectString = `postgres://${config.database.user}:${config.database.pass}@${config.database.host}:${config.database.port}/${config.database.name}`;
  let pool = new Pool({  
    connectionString: defaultConnectString
  }); 
  let client = await pool.connect();  
  try {      
    try {  
      // First, try to create the database if it doesn't exist  
      await client.query(`CREATE DATABASE "${config.database.name}"`);  
      console.log(`Database (${config.database.name}) created.`);  
    } catch (error) {  
      if (error.code === '42P04') {   
        console.log(`Database already exists.`);  
      } else {  
        throw error;   
      }  
    } finally {  
      client.release();  
    }  

    // Reconfigure the pool to connect to the newly created database, assuming creation or existence  
    pool = new Pool({  
      connectionString: realConnectString  
    });  
    client = await pool.connect();  
    console.log("Connected successfully to PostgreSQL.");  
    
    // Any additional setup, like schema or tables, should ideally be done here  
    // Example: await client.query("CREATE TABLE IF NOT EXISTS ...");  
    await database.sync();
  } catch (error) {  
    console.error(`Database operation failed: ${error.message}`);  
    process.exit(1);  
  } finally {  
    if (client) client.release();  // Ensure client is released in case of any failures  
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
};

exports.webSocket = async () => {
  connectWebSocket();
};
