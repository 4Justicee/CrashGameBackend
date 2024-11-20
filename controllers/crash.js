const MD5 = require("md5.js");
const { Op } = require('sequelize');  
const { User, Player, Agent, RoundInfo, Prepare, sequelize } = require("../models");
const { GAME_ERR_MSG, GAME_RESPONSE_CODE } = require("../utils/constants");
const jwt = require('jsonwebtoken');  
const config = require("../config/preference")
const {isEmpty} = require("../utils/empty");
const {calculateCrashMultiplier} = require("../utils/random")

const crypto = require('crypto'); 
const wsManager = require('./websocket');  

const e = Math.E;  // Euler's number
const k = 0.2;  // Growth rate constant  

let gameRunning = false;
let multiplier = 1.0;  
let startTime = Date.now();
let currentRecordId = 0;
let timeRemaining = 0;

const waitTime = config.waitTime;

async function processBetUsers(multi, key, hash) {
  const prepares = await Prepare.findAll();
  const bets = [];

  for(let i = 0; i < prepares.length; i++) {
    const user_id = prepares[i].user_id;
    const currency = prepares[i].currency;
    const betAmount = prepares[i].betAmount;
    const autoCashOut = prepares[i].autoCashOut;

    bets.push({
      uid: user_id,
      currency,
      betAmount,
      autoCashOut
    })
  }
  Prepare.destroy({where:{}});
  const  o = await RoundInfo.create({roundState: 0, betUserList: JSON.stringify(bets), cashOutUserList:'[]', roundMaxMulti: multi, nounce: hash, secretKey: key});
  currentRecordId = o.id;
}

async function gamePreProcessing() {
  gameRunning = true;  
  multiplier = 1.0;  
  startTime = Date.now() + 7000; 

  const seed = crypto.randomBytes(16).toString('hex');
  const o = calculateCrashMultiplier(seed);
  const maxMulti = o.crashPoint;
  const hash = o.hash;
  wsManager.broadcastMessage(JSON.stringify({
    type:'GameWaiting',
    params: {
      success:true,          
      startTime,
    }
  }))

  await processBetUsers(maxMulti, seed, hash);

  return maxMulti;
}

async function gameStartProcessing() {
  const roundInfo = await RoundInfo.findOne({where:{id: currentRecordId}});
  await roundInfo.update({roundState: 1});
  console.log(`Game is starting`);
  wsManager.broadcastMessage(JSON.stringify({
    type:'GameRunning',
    params: {
      success:true,          
      startTime,
    }
  }))
}

async function checkWinners(multiplier) {
  const roundInfo = await RoundInfo.findOne({where:{id: currentRecordId}});
  let tempBetUsers = roundInfo.betUserList;
  let tempCashOutUsers = roundInfo.cashOutUserList;

  for(let i = 0; i < tempBetUsers.length; i++) {
    const uid = tempBetUsers[i].uid;
    const currency = tempBetUsers[i].currency;
    const betAmount = tempBetUsers[i].betAmount;
    const autoCashOut = tempBetUsers[i].autoCashOut;

    let cashOut = 0;
    let cashOutTime = 0;
    let isCashedOut = false;
    let winnings = 0;

    for(let j = 0; j < tempCashOutUsers.length; j++) {
      const cuid = tempCashOutUsers[j].uid;
      const cashOutValue = tempCashOutUsers[j].cashOut;
      const time = tempCashOutUsers[j].cashOutTime;
      if(cuid == uid) {
        cashOut = cashOutValue;
        cashOutTime = time;
        isCashedOut = true;
        winnings = cashOut * betAmount;        
        break;
      }
    }
    if(winnings == 0 && multiplier >= autoCashOut) {     
      winnings = autoCashOut * betAmount;
      const u = await User.findOne({where:{id: uid}, order:[["id","desc"]]});
      await u.setBalance(0, winnings, currency);      
      await roundInfo.addUserData('cashOutUserList', {
        uid,
        cashOut: autoCashOut,
        cashOutTime: Date.now()
      });
      wsManager.broadcastMessage(JSON.stringify({
        type:'PlayerWon',
        params:{
          ethBalance: u.ethbalance,
          btcBalance: u.btcbalance,
          multiplier : autoCashOut,
          uid
        }
      }))
    }
  }
}

async function gameCrashProcessing(multiplier) {
  console.log('Game crashed at multiplier:', multiplier);  
  const roundInfo = await RoundInfo.findOne({where:{roundState: 1}});

  const betUserList = roundInfo.betUserList;
  const cashOutUserList = roundInfo.cashOutUserList;
  
  const playersObj = [];
  const winnerObj = [];

  let totalETHDebit = 0, totalBTCDebit = 0, totalETHCredit = 0, totalBTCCredit = 0;

  for(let i = 0; i < betUserList.length; i++) {
    const uid = betUserList[i].uid;
    const currency = betUserList[i].currency;
    const betAmount = betUserList[i].betAmount;
    const autoCashOut = betUserList[i].autoCashOut;
   
    let cashOut = 0;
    let cashOutTime = 0;
    let isCashedOut = false;
    let winnings = 0;

    for(let j = 0; j < cashOutUserList.length; j++) {
      const cuid = cashOutUserList[j].uid;
      const cashOutValue = cashOutUserList[j].cashOut;
      const time = cashOutUserList[j].cashOutTime;
      if(cuid == uid) {
        cashOut = cashOutValue;
        cashOutTime = time;
        isCashedOut = true;
        winnings = cashOut * betAmount;        
        break;
      }
    }
    if(isCashedOut == false && multiplier >= (Number)(autoCashOut)) {
      winnings = multiplier * betAmount;
    }
    
    if(currency.toUpperCase() == "ETH") {
      totalETHDebit += betAmount;
      totalETHCredit += winnings;
    }
    else {
      totalBTCDebit += betAmount;
      totalBTCCredit += winnings;
    }

    const obj = {
      wallet:'testWallet',
      betAmount,
      currency,
      autoCashOut,
      cashOut,
      cashOutTime,
      isCashedOut,
      winnings,
      uid,
    };

    playersObj.push(obj)

    if(winnings!= 0) {
      winnerObj.push(obj);
    }
  }
  
  let ETHRtp = totalETHCredit == 0 ? 0 : (totalETHCredit / totalETHDebit) * 100
  let BTCRtp = totalBTCCredit == 0 ? 0 : (totalBTCCredit / totalBTCDebit) * 100

  await roundInfo.update({
    roundState: 2, 
    roundTotalDebits:`${totalETHDebit},${totalBTCDebit}`, 
    roundTotalCredits:`${totalETHCredit},${totalBTCCredit}`,
    roundRtps: `${ETHRtp},${BTCRtp}`,
  });

  const duration = Date.now() - startTime;

  wsManager.broadcastMessage(JSON.stringify({
    type:'GameCrashed',
    params: {
      game: {success:true,          
        startTime,
        duration,
        multiplier,
        players:playersObj,
        winners:winnerObj,
        hash:roundInfo.nounce,
      }
    }
  }))
  currentRecordId = 0;
  gameRunning = false;  
  // Wait 7 seconds after crash then check to restart game  
  setTimeout(checkGameStart, 2000);  
}

async function startGame() {      
  const maxMulti = await gamePreProcessing();

  wsManager.broadcastMessage(JSON.stringify({
    type:'r',
    params:{
      t:timeRemaining
    }
  }));
  
  const waitTimer = setInterval(async ()=>{
    timeRemaining -= 1;
    console.log(`Game starting in ${timeRemaining} seconds...`);  
    
    wsManager.broadcastMessage(JSON.stringify({
      type:'r',
      params:{
        t:timeRemaining
      }
    }));

    if(timeRemaining <= 0) {
      clearInterval(waitTimer);
      await gameStartProcessing();

      const gameInterval = setInterval(() => {  
        const now = Date.now();
        const secondsSinceStart = (now - startTime) / 1000;  
        multiplier = Math.pow(e, k * secondsSinceStart);  
        wsManager.broadcastMessage(JSON.stringify({type:'g', params:{m:multiplier > maxMulti ? maxMulti: multiplier, e: (now - startTime)}}))

        checkWinners(multiplier);

        if (multiplier > maxMulti) {  
          clearInterval(gameInterval);              
          gameCrashProcessing(maxMulti);
        }        
      }, 50);  
    }    
  }, 1000) 
}

async function checkGameStart() {  
  timeRemaining = waitTime;
  if (!gameRunning) {  
      await startGame();  
  } else if (!gameRunning) {  
      console.log("Waiting for players...");  
  }  
}  

async function betListFunc() {
  const roundInfo = await RoundInfo.findOne({where:{roundState: {[Op.not]: 2}},order:[["id","desc"]]});
  if(isEmpty(roundInfo))  {
    wsManager.broadcastMessage(JSON.stringify({
      type:'BetList',
      params: {
        players:[],
        waiting:[],
      }
    }));
    return;
  }

  const betUsers = roundInfo.betUserList;
  const cashOutUsers = roundInfo.cashOutUserList;
  const roundState = roundInfo.roundState;
  const players = [];
  const waiting = [];

  let cashOut = 0;
  let cashOutTime = 0;
  let isCashedOut = false;
  let winnings = 0;
  
  for(let i = 0; i < betUsers.length; i++) {
    const uid = betUsers[i].uid;
    const currency = betUsers[i].currency;
    const betAmount = betUsers[i].betAmount;
    const autoCashOut = betUsers[i].autoCashOut;
    if(roundState == 0) {
      waiting.push({
        uid,
        betAmount,
        currency,
        autoCashOut,
        cashOut,
        cashOutTime,
        isCashedOut,
        winnings
      })
    }
    else {
      for(let j = 0; j < cashOutUsers.length; j++) {
        const cuid = cashOutUsers[j].uid;
        const cashOutValue = cashOutUsers[j].cashOut;
        const time = cashOutUsers[j].cashOutTime;
        if(cuid == uid) {
          cashOut = cashOutValue;
          cashOutTime = time;
          isCashedOut= true;
          winnings = cashOut * betAmount;
          break;
        }
      }

      players.push({
        uid,
        betAmount,
        currency,
        autoCashOut,
        cashOut,
        cashOutTime,
        isCashedOut,
        winnings
      })
    }
  }
  wsManager.broadcastMessage(JSON.stringify({
    type:'BetList',
    params: {
      players,
      waiting,
    }
  }));
}

exports.gameSerivce = async (ws, message) => {
  try {
    
  } catch (error) {
    console.log(error);
  }
};

exports.closeGameService = async (ws, message) => {
  try {

  } catch (error) {
    console.log(error);
  }
};

exports.serverFunc = async function GameService() {
  await checkGameStart();

  //send BetList
  setInterval(betListFunc, 1000);

};

exports.authenticate = async function (ws) {
  const token = new MD5().update(""+new Date()).digest("hex");
  const jwtToken = jwt.sign({
    token:token,
    wallet: 'testwallet'
  }, config.secretKey); // Token expires in 1 hour 

  ws.send(JSON.stringify({
    type:'authenticate',
    params: {
      success:true,
      token: jwtToken,
    }
  }))
};

exports.login = async function (ws, o) {  
  try{
    const decoded = jwt.verify(o.token, config.secretKey);    
    let u = await User.findOne({where:{token: decoded.token}});

    let ethBalance = 100000; let btcBalance = 100000;
    if(isEmpty(u)) {
      u = await User.create({token: decoded.token, ethbalance: 100000, btcbalance:100000});      
    }
    else {
      ethBalance = u.ethbalance;
      btcBalance = u.btcbalance;
    }

    ws.send(JSON.stringify({
      type:'login',
      params: {
        success:true,
        uid: u.id,
        ethBalance,
        btcBalance,
      }
    }))
  }
  catch(error) {
    console.log(error)

    ws.send(JSON.stringify({
      type:'login',
      params: {
        success:false,
      }
    }))
  }
};

exports.placeBet = async function (ws, o) {  
  try{
    const decoded = jwt.verify(o.token, config.secretKey);  
    const u = await User.findOne({where:{token: decoded.token}});
    const lastRound = await RoundInfo.findOne({
      where:{      
        roundState: 0,
      },
      order:[["id","desc"]],
    });
    let preparing = 0;
    if(isEmpty(lastRound)) {
      Prepare.create({user_id: u.id, currency:o.currency, betAmount: o.betAmount, autoCashOut: o.autoCashOut})
      preparing = 1;
    }
    else {
      const betData = lastRound.betUserList;
      for(let i = 0 ; i < betData.length; i++) {
        if(betData[i].uid == u.id) {
          ws.send(JSON.stringify({
            type:'placeBet',
            params: {
              success:false,          
              msg: 'already betted'
            }
          }))
          return;  
        }
      }

      addNewBetsToRound(lastRound.id, {uid: u.id, currency:o.currency, betAmount: o.betAmount, autoCashOut: o.autoCashOut});
    }

    await u.setBalance(o.betAmount, 0, o.currency);

    ws.send(JSON.stringify({
      type:'placeBet',
      params: {
        success:true,
        isPreparing: preparing,
        ethBalance: u.ethbalance,
        btcBalance: u.btcbalance
      }
    }))
  }
  catch(error) {
    console.log(error);
    
    ws.send(JSON.stringify({
      type:'placeBet',
      params: {
        success:false,
      }
    }))
  }
};

async function addNewBetsToRound(id, betData) {  
  const result = await sequelize.transaction(async (t) => {  
    // Fetch the round info with lock to prevent race conditions  
    const round = await RoundInfo.findByPk(id, { transaction: t, lock: t.LOCK.UPDATE });  

    if (!round) {  
      throw new Error('Round not found');  
    }  

    // Get current betUserList  
    const currentBets = round.betUserList;  

    // Add new bet to the list  
    currentBets.push(betData);  

    // Update the round with the new list of bets  
    await round.update({ betUserList: JSON.stringify(currentBets) }, { transaction: t });  

    return round;  
  });  

  return result;  
}  

exports.cashOut = async function (ws, o) {  
  try{
    const decoded = jwt.verify(o.token, config.secretKey);  
    const multiplier = o.multiplier;
    const u = await User.findOne({where:{token: decoded.token}});
    const lastRound = await RoundInfo.findOne({
      where:{      
        roundState: 1,
      },
      order:[["id","desc"]],
    });

    if(isEmpty(lastRound) || isEmpty(u) || multiplier > lastRound.roundMaxMulti) {
      ws.send(JSON.stringify({
        type:'PlayerWon',
        params: {
          success:false,
        }
      }))
      return;
    }

    const betUsers = lastRound.betUserList;
    let currency = 'ETH';
    let betAmount = 0;
    let found = 0;
    for(let i = 0; i < betUsers.length; i++) {
      const uid = betUsers[i].uid;
      if(uid == u.id) {
        betAmount = betUsers[i].betAmount;
        currency = betUsers[i].currency;
        found = 1;
        break;
      }
    }
    
    if(found == 1) {      
      lastRound.addUserData('cashOutUserList', {
        uid : u.id,
        cashOut : multiplier,
        cashOutTime : Date.now(),
      });

      await u.setBalance(0, multiplier * betAmount, currency);

      wsManager.broadcastMessage(JSON.stringify({
        type:'PlayerWon',
        params: {
          success:true,
          multiplier,
          uid: u.id,
          ethBalance: u.ethbalance,
          btcBalance: u.btcbalance
        }
      }))  
      return;
    }
    
    ws.send(JSON.stringify({
      type:'PlayerWon',
      params: {
        success:false,
      }
    }))
  }
  catch(error) {
    console.log(error);
    
    ws.send(JSON.stringify({
      type:'PlayerWon',
      params: {
        success:false,
      }
    }))
  }
};

exports.cancelBet = async function (ws, o) {  
  try{
    const decoded = jwt.verify(o.token, config.secretKey);  
    const u = await User.findOne({where:{token: decoded.token}});
    const lastRound = await RoundInfo.findOne({
      where:{      
        roundState: 0,
      },
      order:[["id","desc"]],
    });

    if(isEmpty(lastRound)) {
      ws.send(JSON.stringify({
        type:'cancelBet',
        params: {
          success:false,
          msg:'can not cancel bet while playing'
        }
      }))
      return;
    }

    let currency = 'ETH';
    let betAmount = 0;
    let found = 0;
    const betUsers = lastRound.betUserList;

    for(let i = 0; i < betUsers.length; i++) {
      if(betUsers[i].uid == u.id) {
        betAmount = betUsers[i].betAmount;
        currency = betUsers[i].currency;
        found = 1;
        betUsers.splice(i, 1);
        break;
      }
    }
    
    await u.setBalance(0, betAmount, currency);

    if(found == 1) {
      await lastRound.update({
        betUserList: JSON.stringify(betUsers)
      });
    }
    else {
      await Prepare.destroy({where:{user_id: u.id}});
    }

    ws.send(JSON.stringify({
      type:'cancelBet',
      params: {
        success:true,
        ethBalance: u.ethbalance,
        btcBalance: u.btcbalance
      }
    }))
  }
  catch(error) {
    console.log(error);
    
    ws.send(JSON.stringify({
      type:'PlayerWon',
      params: {
        success:false,
      }
    }))
  }
};