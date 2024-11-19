const express = require("express");
const { connectDb, loadExpress, startServerFunc, webSocket } = require("./loaders");
const config = require("./config/preference");
const socketServer = require("socket.io");
const http = require("http");
const startServer = async () => {
  const app = express();
 
  await connectDb();
  loadExpress({ app });
  await startServerFunc();

  const server = http.createServer(app);
  const io = socketServer(server);

  await webSocket(io);
  await startServerFunc();

  server.listen(config.port, function () {
    console.log("Express Server has started on port.", config.port);
  });
};
startServer();
