const express = require("express");
const router = express.Router();
const config = require("../config/preference");

const plinko = require("./plinko")

router.use("/", (req, res, next) => {
  req.startTime = Date.now();
  next();
});

router.get(`/${config.api.family}/${config.api.endPoint}/${config.api.version}/health-check`, (req, res) => {
  res.status(200).send("OK");
});

router.post(`/init-game`, plinko.initGame);
router.post(`/start-game`, plinko.startGame);
router.post(`/game-result`, plinko.gameResult);

module.exports = router;
