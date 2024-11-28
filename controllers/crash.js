const MD5 = require("md5.js");
const { Op } = require('sequelize');  
const { User, Playing, Transaction, RoundInfo, Balance, Prepare, AutoBet, sequelize } = require("../models");
const jwt = require('jsonwebtoken');  
const config = require("../config/preference")
const {isEmpty} = require("../utils/empty");
const {calculateCrashMultiplier, getValueFromHash, randomInt, dec, enc, isSame} = require("../utils/random")
const crypto = require('crypto'); 
const wsManager = require('./websocket');  
const { Mutex } = require('async-mutex');  
const { resolveObjectURL } = require("buffer");
const balance = require("../models/balance");
const autobet = require("../models/autobet");
const mutex = new Mutex();  

const e = Math.E;  // Euler's number
const k = 0.2;  // Growth rate constant  

let gameRunning = false;
let multiplier = 1.0;  
let startTime = Date.now();
let currentRecordId = 0;
let timeRemaining = 0;
let hashGenerating = 0;
let hashBuffer = [];
let listTimer = 0;

const waitTime = config.waitTime;

async function updateAndDeleteAutobets(bets) {  
  // Start a transaction  
  const t = await sequelize.transaction();  
  const clients = wsManager.getClients(); // Ensuring this returns a Set of WebSocket clients  
  try {  
      // Fetch all AutoBet entries  
      const autoBets = await AutoBet.findAll({ transaction: t });  

      for (let i = 0; i < autoBets.length; i++) {  
          const autoBet = autoBets[i];  
          const betAmount = autoBet.betAmount;  

          // Push the autobet details to bets array  
          bets.push({  
              uid: autoBet.user_id,  
              currency: autoBet.currency,  
              betAmount: autoBet.betAmount,  
              autoCashOut: autoBet.autoCashOut  
          });  

          // Check the balance  
          const balance = await Balance.findOne({  
              where: { user_id: autoBet.user_id, currency: autoBet.currency },  
              transaction: t  
          });  

          if (!balance || balance.balance < betAmount) {             
            for (let client of clients) { // Correct iteration over a Set  
                if (client.id == autoBet.user_id) { // Make sure you reference the correct variable for user_id  
                    client.send(JSON.stringify({
                      type:'auto_cancel',
                      params: {
                        success:true
                      }
                    })); // Correct method to send a message over WebSocket  
                }  
            }  
            continue; // Correct use of continue to skip to the next iteration  
          } 
          await balance.setBalance(betAmount, 0);

          // Decrement the count  
          await autoBet.decrement('autoCount', { transaction: t });  

          // Reload the autoBet after decrement to fetch the updated autoCount  
          await autoBet.reload({ transaction: t });  

          for (let client of clients) { // Correct iteration over a Set  
            if (client.uid == autoBet.user_id) { // Make sure you reference the correct variable for user_id  
              const balances = await Balance.findAll({attributes:["user_id","currency","balance"], where:{user_id: autoBet.user_id}, raw:true});             
                client.send(JSON.stringify({
                  type:'auto_count',
                  params: {
                    success:true,
                    count: autoBet.autoCount,
                    balance: balances,
                  }
                })); // Correct method to send a message over WebSocket  
            }  
          } 

          // Delete the autobet if its count reaches zero  
          if (autoBet.autoCount === 0) {  
              await autoBet.destroy({ transaction: t });  
          }  
      }  

      // If everything went well, commit the transaction  
      await t.commit();  
  } catch (error) {  
      // If something went wrong, rollback the transaction  
      await t.rollback();  
      console.error("Failed to process autobets:", error);  
      throw error; // Re-throw the error to manage it in the outer scope if necessary  
  }  
}  

async function processBetUsers() {
  const prepares = await Prepare.findAll();
  const bets = [];

  const addArray = (data, b)=> {
    const user_id = data.user_id;
    const currency = data.currency;
    const betAmount = data.betAmount;
    const autoCashOut = data.autoCashOut;

    b.push({
      uid: user_id,
      currency,
      betAmount,
      autoCashOut
    })
  }

  for(let i = 0; i < prepares.length; i++) {
    addArray(prepares[i], bets);
  }

  Prepare.destroy({where:{}});

  await updateAndDeleteAutobets(bets);

  const release = await mutex.acquire();  
  try {  
    const  o = await RoundInfo.create({roundState: 0, betUserList: JSON.stringify(bets), cashOutUserList:'[]'});
    currentRecordId = o.id;
  }
  finally {  
    release();  
  }   
  
}

async function gamePreProcessing() {
  gameRunning = true;  
  multiplier = 1.0;  
  startTime = Date.now() + 7000; 

  const t = await Transaction.findOne({
    where:{
      is_used: 0,
    },
    order:[["id","asc"]]
  });

  const maxMulti = getValueFromHash(dec(t.hash));
  t.update({is_used: 1});

  wsManager.broadcastMessage(JSON.stringify({
    type:'GameWaiting',
    params: {
      success:true,          
      startTime,
    }
  }))

  await processBetUsers();

  return maxMulti;
}

async function gameStartProcessing() {
  const release = await mutex.acquire();  
  try {  
    const roundInfo = await RoundInfo.findOne({where:{id: currentRecordId}});
    await roundInfo.update({roundState: 1});
  }
  finally {  
    release();  
  } 
    
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
  let roundInfo = null;
  const release = await mutex.acquire();  
  try {  
    roundInfo = await RoundInfo.findOne({where:{id: currentRecordId}});
  }
  finally {  
    release();  
  } 

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
      const b = await Balance.findOne({where:{user_id: u.id, currency}});
      await b.setBalance(0, winnings);      

      const balances = await Balance.findAll({attributes:["user_id","currency","balance"], where:{user_id: u.id}, raw:true});

      const release = await mutex.acquire();  
      try {  
        await roundInfo.addUserData('cashOutUserList', {
          uid,
          cashOut: autoCashOut,
          cashOutTime: Date.now()
        });
      }
      finally {  
        release();  
      } 

      wsManager.broadcastMessage(JSON.stringify({
        type:'PlayerWon',
        params:{
          balance: balances,
          multiplier : autoCashOut,
          uid
        }
      }))
    }
  }
}

const sendRemainingTimeToUsers = (time) => {
  wsManager.broadcastMessage(JSON.stringify({
    type:'r',
    params:{
      t:time
    }
  }));
}

async function gameCrashProcessing(multiplier) {
  console.log('Game crashed at multiplier:', multiplier);  
  let roundInfo = null;
  let release = await mutex.acquire();  
  try {  
    roundInfo = await RoundInfo.findOne({where:{roundState: 1}});
  }
  finally {  
    release();  
  } 

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
  
  release = await mutex.acquire()
  try {
    await roundInfo.update({
      roundState: 2, 
      roundTotalDebits:`${totalETHDebit},${totalBTCDebit}`, 
      roundTotalCredits:`${totalETHCredit},${totalBTCCredit}`,
      roundRtps: `${ETHRtp},${BTCRtp}`,
    });
  }
  finally {  
    release();  
  } 

  const duration = Date.now() - startTime;
  const t = await Transaction.findOne({where:{is_used: 1}, order:[["id","desc"]]});
  let seed = "";
  if(t.init_seed != "") {    
    seed = dec(t.init_seed);
  }

  wsManager.broadcastMessage(JSON.stringify({
    type:'GameCrashed',
    params: {
      game: {success:true,          
        startTime,
        duration,
        multiplier,
        players:playersObj,
        winners:winnerObj,
        roundId: roundInfo.id,
        hash:dec(t.hash),
        seed
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
  listTimer = setInterval(betListFunc, 1000);

  sendRemainingTimeToUsers(timeRemaining)
  
  const waitTimer = setInterval(async ()=>{
    timeRemaining -= 1;
    console.log(`Game starting in ${timeRemaining} seconds...`);      

    sendRemainingTimeToUsers(timeRemaining);

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
          clearInterval(listTimer);

          gameCrashProcessing(maxMulti);
          transactionFunc();
        }        
      }, 50);  
    }    
  }, 1000) 
}

async function checkGameStart() {  
  timeRemaining = waitTime;   
  //console.log("Waiting for players...");  

  await startGame();  
}  

async function generateHashFunction() {  
  let currentObj = {};  
  // Generate an initial seed using SHA-256 based on the current timestamp and a random number.  
  const data = await Transaction.findOne({order:[['id', 'desc']]})
  const lastId = data.id;

  const nowTime = Date.now();
  const randomValue = randomInt(1, 10000000);

  const initialSeed = crypto.createHash('sha256')  
                      .update(`${nowTime}:${randomValue}`)  
                      .digest('hex');  

  // Retrieve the maximum number of turns from the configuration, ensuring it's a Number.  
  const maxTurns = Number(config.max_turns);  

  // Calculate how many batches (each of 10,000 items) needed to process all turns.  
  const numBatches = Math.ceil(maxTurns / 10000);  

  for (let i = 0; i < numBatches; i++) {  
    const recordsBatch = [];  
    const maxj = (i == numBatches - 1) ? maxTurns % 10000 : 10000;

    for (let j = 0; j < maxj; j++) {  
      const index = i * 10000 + j;  

      if (index === 0) {  
        // Calculate the crash multiplier for the first item using the initial seed.  
        currentObj = calculateCrashMultiplier(initialSeed);  
      } else {  
        // For subsequent items, use the previous hash to calculate the next multiplier.  
        currentObj = calculateCrashMultiplier(currentObj.hash);  
      }  

      // Prepare record to be pushed with conditionally setting the initial seed.  
      recordsBatch.push({  
        id: lastId + maxTurns - index,  
        hash: enc(currentObj.hash),  
        init_seed: index === 0 ? enc(`${initialSeed}-${nowTime}-${randomValue}`) : ''  
      });  
    }  

    // Push the batch of records to the global buffer for later processing.  
    hashBuffer.push(recordsBatch);  
  }  

  // Set flag to indicate hash generation has completed and bulk creation can start.  
  hashGenerating = 2;  
}  

async function transactionFunc() {  
  // Acquire the mutex lock before proceeding with the database operation.  
  const release = await mutex.acquire();  
  
  try {  
    // .count() method to determine the number of entries that haven't been used yet.  
    const count = await Transaction.count({  
      where: {  
        is_used: 0  
      }  
    });  

    // Check if the unused entries are less than 20% of max_turns and hash generation is not active.  
    if (count <= config.max_turns * 0.2 && hashGenerating === 0) {  
      hashGenerating = 1;  // Flag that hash generation is starting.  
      setTimeout(generateHashFunction, 1000);  // Schedule hash generation after 1 second.  
    }  
  } finally {  
    release();  // Always release the mutex lock regardless of how try block exits.  
  }  

  // Check if there's an indication to start bulk creation.  
  if (hashGenerating === 2) {  
    await timedBulkCreate();  // Call function for bulk DB operations as needed.  
  }  
}  

async function timedBulkCreate() {  
  const startTime = Date.now();  
  (async function run() {  
    while (true) {  // Loop continuously until a break condition is met.  
      if (hashBuffer.length == 0) {  
          hashGenerating = 0;  // Set to 0 when buffer is empty.  
          break;  
      }  
      
      const elem = hashBuffer.pop();  // Pop an element from the buffer.  
      const release = await mutex.acquire();  // Acquire mutex lock.  
      try {  
          await Transaction.bulkCreate(elem);  // Attempt bulk database creation.  
      } catch (error) {  
          console.error('Error during bulk creation:', error);  
      } finally {  
          release();  // Ensure the mutex is released.  
      }  

      const elapsedTime = Date.now() - startTime;  
      if (elapsedTime > 4000) {  // More than 4 seconds.  
        console.log("Stopped after 4 seconds");  
        break;  
      }  
    }  
  })();  
}  

async function betListFunc() {
  let roundInfo = null;
  const release = await mutex.acquire();  
  try {  
    roundInfo = await RoundInfo.findOne({where:{roundState: {[Op.not]: 2}},order:[["id","desc"]]});
  }
  finally {  
    release();  
  } 

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
  const totalPlayers = wsManager.getClients().size;  
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
      totalPlayers,
      players,
      waiting,
    }
  }));
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

exports.serverFunc = async function GameService() {
  await checkGameStart();
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
    ws.uid = u.id;

    if(isEmpty(u)) {
      u = await User.create({token: decoded.token});      
    }

    const currencies = config.currencies;

    let b = await Balance.findAll({attributes:["user_id","currency","balance"], where:{user_id: u.id}, raw:true});

    if(isEmpty(b)) {
      const o = [];
      for(let i = 0; i < currencies.length; i++) {
        o.push({user_id: u.id, currency:currencies[i], balance: 0});        
      }
      Balance.bulkCreate(o);

      b = o;
    }     
    
    ws.send(JSON.stringify({
      type:'login',
      params: {
        success:true,
        uid: u.id,
        balance: b,
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
    const b = await Balance.findOne({where:{user_id: u.id, currency: o.currency}});

    const lastRound = await RoundInfo.findOne({
      where:{      
        roundState: 0,
      },
      order:[["id","desc"]],
    });

    if(b.balance < o.betAmount) {
      return ws.send(JSON.stringify({
        type:'placeBet',
        params: {
          success:false,
        }
      }))
    }
    
    let preparing = 0;
    if(isEmpty(lastRound)) {
      const p = await Prepare.findOne({where:{user_id: u.id}});
      if(!isEmpty(p)) {
        return ws.send(JSON.stringify({
          type:'placeBet',
          params: {
            success:false,
            msg: 'already betted'
          }
        }))
      }

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

    await b.setBalance(o.betAmount, 0);
    const balances = await Balance.findAll({attributes:["user_id","currency","balance"], where:{user_id: u.id}, raw:true});

    ws.send(JSON.stringify({
      type:'placeBet',
      params: {
        success:true,
        isPreparing: preparing,
        balance: balances
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

      const b = await Balance.findOne({where:{user_id: u.id, currency}})
      await b.setBalance(0, multiplier * betAmount);
      const balances = await Balance.findAll({attributes:["user_id","currency","balance"], where:{user_id: u.id}, raw:true});

      wsManager.broadcastMessage(JSON.stringify({
        type:'PlayerWon',
        params: {
          success:true,
          multiplier,
          uid: u.id,
          balance: balances
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
  try {  
    // Verify token and retrieve user  
    const decoded = jwt.verify(o.token, config.secretKey);  
    const user = await User.findOne({where: {token: decoded.token}});  
    if (!user) throw new Error('User not found');  

    // Find any existing preparation for the user  
    const preparation = await Prepare.findOne({where: {user_id: user.id}});  
    
    if (preparation) {  
      return await handlePreparedBetCancellation(user, preparation, ws);  
    }  

    // Handle cancellations when no preparation is found  
    return await handleActiveRoundBetCancellation(user, ws);  
  } catch (error) {  
    console.error(error);  
    ws.send(JSON.stringify({ type: 'PlayerWon', params: { success: false } }));  
  }  
};  

async function handlePreparedBetCancellation(user, preparation, ws) {  
  const {currency, betAmount} = preparation;  
  const balance = await updateBalancePlus(user.id, currency, betAmount);  

  await Prepare.destroy({where: {user_id: user.id}});  
  
  ws.send(JSON.stringify({  
    type: 'cancelBet',  
    params: {  
      success: true,  
      balance
    }  
  }));  
}  

async function handleActiveRoundBetCancellation(user, ws) {  
  const lastRound = await RoundInfo.findOne({  
    where: { roundState: 0 },  
    order: [["id", "desc"]],  
  });  

  if (!lastRound) {  
    ws.send(JSON.stringify({  
      type: 'cancelBet',  
      params: { success: false, msg: 'Cannot cancel bet while playing' }  
    }));  
    return;  
  }  

  const betUsers = lastRound.betUserList; // Assuming this is stored as JSON string  
  const index = betUsers.findIndex(bet => bet.uid === user.id);  

  if (index === -1) {  
    ws.send(JSON.stringify({  
      type: 'cancelBet',  
      params: { success: false }  
    }));  
    return;  
  }  

  const {betAmount, currency} = betUsers[index];  
  betUsers.splice(index, 1);  

  const balance = await updateBalancePlus(user.id, currency, betAmount);  

  await lastRound.update({ betUserList: JSON.stringify(betUsers) });  

  ws.send(JSON.stringify({  
    type: 'cancelBet',  
    params: {  
      success: true,  
      balance  
    }  
  }));  
}  

async function updateBalancePlus(userId, currency, amount) {  
  const balanceRecord = await Balance.findOne({ where: {user_id: userId, currency}});  
  await balanceRecord.setBalance(0, amount);  
  return Balance.findAll({  
    attributes: ["user_id", "currency", "balance"],   
    where: {user_id: userId},   
    raw: true  
  });  
}  

exports.autoBet = async function (ws, o) {  
  try{
    const decoded = jwt.verify(o.token, config.secretKey);  
    const u = await User.findOne({where:{token: decoded.token}});
    const p = await Prepare.findOne({where:{user_id: u.id}});    
    const e = await AutoBet.findOne({where:{user_id: u.id}});

    if(!isEmpty(p)) {
      ws.send(JSON.stringify({
        type:'autoBet',
        params: {
          success:false,
          msg:'Betting prepared now.'
        }
      }))  
      return;
    }

    if(!isEmpty(e)) {
      ws.send(JSON.stringify({
        type:'autoBet',
        params: {
          success:false,
          msg:'Already exist'
        }
      }))  
      return;
    }

    AutoBet.create({
      user_id: u.id,
      currency: o.currency,
      betAmount: o.betAmount,
      autoCashOut : o.autoCashOut,
      autoCount: o.autoCount,    
    })

    ws.send(JSON.stringify({
      type:'autoBet',
      params: {
        success:true,
        count: o.autoCount, 
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

exports.cancelAutoBet = async function (ws, o) {  
  try{
    const decoded = jwt.verify(o.token, config.secretKey);  
    const u = await User.findOne({where:{token: decoded.token}});
    const e = await AutoBet.findOne({where:{user_id: u.id}});
    if(isEmpty(e)) {
      ws.send(JSON.stringify({
        type:'cancelAutoBet',
        params: {
          success:false,
          msg:'Bet not exist'
        }
      }))  
      return;
    }

    e.destroy();

    ws.send(JSON.stringify({
      type:'cancelAutoBet',
      params: {
        success:true,          
        data: 0,
      }
    }))
  }
  catch(error) {
    console.log(error);
    
    ws.send(JSON.stringify({
      type:'cancelAutoBet',
      params: {
        success:false,
        data: 0,
      }
    }))
  }
};