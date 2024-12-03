const express = require("express");
const { connectDb, loadExpress, startServerFunc, webSocket } = require("./loaders");
const config = require("./config/preference");
const redisService = require("./redis")

const startServer = async () => {
  const app = express();
 
  await connectDb();
  loadExpress({ app });

  await webSocket();
  await startServerFunc();
  
  redisService.connectRedis();

  app.listen(config.port, function () {
    console.log("Express Server has started on port.", config.port);
  });
};
startServer();
