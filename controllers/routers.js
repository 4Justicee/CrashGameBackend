const express = require("express");
const router = express.Router();
const config = require("../config/preference");

router.use("/", (req, res, next) => {
  req.startTime = Date.now();
  next();
});

module.exports = router;
