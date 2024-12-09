const MD5 = require("md5.js");
const { Op } = require('sequelize');  
const { User, Playing, Transaction, RoundInfo, Balance, Prepare, AutoBet, sequelize } = require("../models");
const jwt = require('jsonwebtoken');  
const config = require("../config/preference")
const {isEmpty} = require("../utils/empty");
const {generatePlinko, getValueFromHash, randomInt, dec, enc, isSame} = require("../utils/random")
const crypto = require('crypto'); 
const wsManager = require('./websocket');  
const cron = require('cron')
const { Mutex } = require('async-mutex');  
const mutex = new Mutex();  

const multiplierObjs = {
  16 : [
    [16, 9, 2, 1.4, 1.4, 1.2, 1.1, 1, 0.5, 1, 1.1, 1.2, 1.4, 1.4, 2, 9, 16],
    [110, 41, 10, 5, 3, 1.5, 1, 0.5, 0.3, 0.5, 1, 1.5, 3, 5, 10, 41, 110],
    [1000, 130, 26, 9, 4, 2, 0.2, 0.2, 0.2, 0.2, 0.2, 2, 4, 9, 26, 130, 1000],
  ],
  15 :  [
    [15, 8, 3, 2, 1.5, 1.1, 1, 0.7, 0.7, 1, 1.1, 1.5, 2, 3, 8, 15],
    [88, 18, 11, 5, 3, 1.3, 0.5, 0.3, 0.3, 0.5, 1.3, 3, 5, 11, 18, 88],
    [620, 83, 27, 8, 3, 0.5, 0.2, 0.2, 0.2, 0.2, 0.5, 3, 8, 27, 83, 620],
  ],
  14: [
    [7.1, 4, 1.9, 1.4, 1.3, 1.1, 1, 0.5, 1, 1.1, 1.3, 1.4, 1.9, 4, 7.1],
    [58, 15, 7, 4, 1.9, 1, 0.5, 0.2, 0.5, 1, 1.9, 4, 7, 15, 58],
    [420, 56, 18, 5, 1.9, 0.3, 0.2, 0.2, 0.2, 0.3, 1.9, 5, 18, 56, 420],
  ],
  13: [
    [8.1, 4, 3, 1.9, 1.2, 0.9, 0.7, 0.7, 0.9, 1.2, 1.9, 3, 4, 8.1],
    [43, 13, 6, 3, 1.3, 0.7, 0.4, 0.4, 0.7, 1.3, 3, 6, 13, 43],
    [260, 37, 11, 4, 1, 0.2, 0.2, 0.2, 0.2, 1, 4, 11, 37, 260],
  ],
  12: [
    [10, 3, 1.6, 1.4, 1.1, 1, 0.5, 1, 1.1, 1.4, 1.6, 3, 10],
    [33, 11, 4, 2, 1.1, 0.6, 0.3, 0.6, 1.1, 2, 4, 11, 33],
    [170, 24, 8.1, 2, 0.7, 0.2, 0.2, 0.2, 0.7, 2, 8.1, 24, 170],
  ],
  11:[
    [8.4, 3, 1.9, 1.3, 1, 0.7, 0.7, 1, 1.3, 1.9, 3, 8.4],
    [24, 6, 3, 1.8, 0.7, 0.5, 0.5, 0.7, 1.8, 3, 6, 24],
    [120, 14, 5.2, 1.4, 0.4, 0.2, 0.2, 0.4, 1.4, 5.2, 14, 120],
  ],
  10 : [
    [8.9, 3, 1.4, 1.1, 1, 0.5, 1, 1.1, 1.4, 3, 8.9],
    [22, 5, 2, 1.4, 0.6, 0.4, 0.6, 1.4, 2, 5, 22],
    [76, 10, 3, 0.9, 0.3, 0.2, 0.3, 0.9, 3, 10, 76],
  ],
  9: [
    [5.6, 2, 1.6, 1, 0.7, 0.7, 1, 1.6, 2, 5.6],
    [18, 4, 1.7, 0.9, 0.5, 0.5, 0.9, 1.7, 4, 18],
    [43, 7, 2, 0.6, 0.2, 0.2, 0.6, 2, 7, 43],
  ],
  8: [
    [5.6, 2.1, 1.1, 1, 0.5, 1, 1.1, 2.1, 5.6],
    [13, 3, 1.3, 0.7, 0.4, 0.7, 1.3, 3, 13],
    [29, 4, 1.5, 0.3, 0.2, 0.3, 1.5, 4, 29],
  ]
}

class Node {
  constructor(data) {
    this.data = data;
    this.nextLeft = null;
    this.nextRight = null;
  }
}

class LinkedList {
  constructor(head = null) {
    this.head = head;
  }
}

exports.initGame = async (req, res) => {
  try {
    let { token, rows, risk } = req.body;

    let user = {};
    if(token === "") {
      const t = new MD5().update(""+new Date()).digest("hex")
      token = jwt.sign({
        token:t,
      }, config.secretKey);
      
      user = await User.create({token : t});
    } 
    else {
      const decoded = jwt.verify(token, config.secretKey);    
      user = await User.findOne({token: decoded.token});
    }   
    
    let balances = await Balance.findAll({attributes:["user_id","currency","balance"], where:{user_id: user.id}, raw:true});

    if(isEmpty(balances)) {
      const tmpBalance = [];
      for(let i = 0; i < config.currencies.length; i++) {
        tmpBalance.push({user_id: user.id, currency:config.currencies[i], balance: 0});        
      }
      Balance.bulkCreate(tmpBalance);

      balances = tmpBalance;
    }

    const multipliers = multiplierObjs[rows][risk];
    const mtoken = jwt.sign(JSON.stringify(multipliers), config.secretKey);

    res.send({
      balances,
      token,
      mtoken,
      multipliers
    })

  } catch (error) {
    //console.log(error);
  }
}

const calculateMultiplier = (directions, multipliers, rows) => {  
  const mainNode = new Node(0);
  const list = new LinkedList(mainNode);

  let tempOldNodeArr = [mainNode];
  let tempNewNodeArr = [];
  let nodeArr = [];
  let rowCount = 1;
  let ctr = 1;

  for (let i = 0; i < rows + 2; i++) {
    for (let j = 0; j < rowCount + 1; j++) {
      tempNewNodeArr.push(new Node(ctr));
      ctr += 1;
    }
    for (let k = 0; k < rowCount; k++) {
      tempOldNodeArr[k].nextLeft = tempNewNodeArr[k];
      tempOldNodeArr[k].nextRight = tempNewNodeArr[k + 1];
    }
    nodeArr.push(tempOldNodeArr);
    tempOldNodeArr = [...tempNewNodeArr];
    tempNewNodeArr = [];
    rowCount += 1;
  }
  tempOldNodeArr[0].data = null;
  tempOldNodeArr[tempOldNodeArr.length - 1].data = null;
  for (let i = 0; i + 1 < tempOldNodeArr.length - 1; i++) {
    tempOldNodeArr[i + 1].data = multipliers[i];
  }
  tempOldNodeArr.shift();
  tempOldNodeArr.pop();
  
  let multiplier = 0;
  let path = [];
  let idx = 0;

  while (list.head) {
    multiplier = list.head.data;
    if(idx < 2) {
      if (Math.random() > 0.5) {
        list.head = list.head.nextLeft;
        path.push(-1);
      } else {
        list.head = list.head.nextRight;
        path.push(1);
      }
    }
    else {
      if(directions[idx - 2] == true) {
        list.head = list.head.nextLeft;
        path.push(-1);
      }
      else {
        list.head = list.head.nextRight;
        path.push(1);
      }
    }
    idx++;
  }
  path.pop();
  
  return {multiplier, path};
};  

exports.startGame = async (req, res) => {
  try {
    let { token, mtoken, client_seed, betAmount, currency, risk, rows } = req.body;

    if(token === "" || mtoken == "") {
      return res.send({bet_status: -1});
    } 
    
    const userToken = jwt.verify(token, config.secretKey);    
    const multipliers = jwt.verify(mtoken, config.secretKey);    
    const user = await User.findOne({token: userToken});

    if(isEmpty(user)) {
      return res.send({bet_status: -2});
    }

    let balances = await Balance.findOne({where:{user_id: user.id, currency: currency}});
    let balance = balances.balance;

    if(betAmount > balance) {
      return res.send({bet_status: -3});
    }

    const server_seed = new MD5().update(user.id+":"+new Date()).digest("hex");

    const info = await RoundInfo.create({
      user_id: user.id,
      user_seed: client_seed,
      server_seed : server_seed,
      bet_amount: betAmount,
      currency,
      risk,
      rows
    });

    const nonce = info.id;
    const result = generatePlinko(client_seed, server_seed, nonce);
    const hash = result.hash;
    const direction = result.directions.slice(0, rows);

    const multiplierObj = calculateMultiplier(direction, multipliers, rows);
    const multiplier = multiplierObj.multiplier;

    info.update({
      multiplier,
      path: JSON.stringify(multiplierObj.path),
      hash,
      nonce,
      win : betAmount * multiplier,
    });

    await balances.setBalance(betAmount, 0);
    const newBalances = await Balance.findAll({where:{user_id: user.id}, raw:true});
    balances.setBalance(0, betAmount * multiplier)

    res.send({
      bet_status: 1,
      balances : newBalances,
      path : multiplierObj.path,
      win : betAmount * multiplier,
    })

  } catch (error) {
    console.log(error);
    return res.send({bet_status: 0});
  }
}

exports.gameResult = async (req, res) => {
  try {
    let { token } = req.body;

    if(token === "" ) {
      return res.send({result_status: -1});
    } 
    
    const userToken = jwt.verify(token, config.secretKey);    
    const user = await User.findOne({token: userToken});

    if(isEmpty(user)) {
      return res.send({result_status: -2});
    }

    let balances = await Balance.findAll({where:{user_id: user.id}});
    
    res.send({
      result_status: 1,
      balances : balances,
    })

  } catch (error) {
    console.log(error);
    return res.send({result_status: 0});
  }
}

exports.gameSerivce = async (ws, message) => {
  try {
    
  } catch (error) {
    //console.log(error);
  }
};

exports.closeGameService = async (ws, message) => {
  try {

  } catch (error) {
    //console.log(error);
  }
};

exports.scheduleRemoveOldRecords = async() => {
  console.log('Schedule old data remove...');

  const job = new cron.CronJob('0 0 1 * *', deleteOldRecords, null, true, 'America/Los_Angeles');  
  job.start();
}


function deleteOldRecords() {  
  const THIRTY_DAYS_AGO = new Date(new Date() - 3 * 24 * 60 * 60 * 1000);  

  RoundInfo.destroy({  
      where: {  
          createdAt: {  
              [Op.lt]: THIRTY_DAYS_AGO  // Op.lt is "less than"  
          }  
      }  
  }).then(result => {  
      console.log(`Deleted ${result} old records.`);  
  }).catch(error => {  
      console.error('Error while deleting old records:', error);  
  });  
}  