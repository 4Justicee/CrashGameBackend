const config = require("../config/preference");
const { isEmpty } = require("../utils/empty");
const { Event } = require("../models");
const axios = require("axios");

exports.sendEvent2Agent = async (eventObj, { agent, player, game }) => {
  const requestData = {
    method: "transaction",
    round_id: Date.now(),
    user_code: eventObj.userCode,
    game_code: eventObj.gameCode,
    txn_id: eventObj.txnID,
    bet: eventObj.bet,
    win: eventObj.win,
    type: eventObj.type,
    virtual_bet: player.virtualBet,
    provider_code: game.unionCode,
    sub_provider_code: game.unionCode,
    call: player.callObj || {},
    txn_type: eventObj.txnType,
    call_hist_id: player.callHistId || -1,
    is_anti_bet: eventObj.isAntiBet > 0,
    is_buy: eventObj.isBuy > 0,
    is_call: eventObj.isCall > 0,
    pattern_id: 0,
    game_name: eventObj.gameCode,
  };

  const agentResponse = await sendRequest2Agent("Send Event to Agent", agent, requestData);

  if (agentResponse.status == 0) {
    eventObj.checked = 2; //                    0                       2                                                          .
  }

  if (agentResponse.status == 1) {
    eventObj.checked = 1;
  }

  Event.create(eventObj);

  return agentResponse;
};

const postRequest = async (comment, method, url, data = null, headers = null) => {
  let reqConfig = {
    method,
    url,
    timeout: 1000 * 30,
  };

  if (!isEmpty(data)) {
    reqConfig.data = data;
  }
  if (!isEmpty(headers)) {
    reqConfig.headers = headers;
  }

  let response;
  try {
    response = await axios(reqConfig);
    return response;
  } catch (err) {
    console.log(comment, "[Axios Request failed]:");
    console.log(err);
    response = {
      data: {
        status: 2,
        msg: "Network Error",
      },
    };
    return response;
  }
};

const sendRequest2Agent = async (comment, agent, data) => {
  const url = `${agent.agentEndpoint}/goldslot_callback_api`;

  let result;
  for (let idx = 0; idx < 5; idx++) {
    result = await postRequest(comment, "POST", url, data);
    if (result.data.status !== 2) {
      return result.data;
    }
  }
  return result.data;
};
