exports.SERVER_ERR_MSG = {
  INTERNAL_ERROR: "INTERNAL_ERROR",
  EXTERNAL_ERROR: "EXTERNAL_ERROR",

  INVALID_PATTERN: "INVALID_PATTERN",
  INVALID_GAME_TABLE: "INVALID_GAME_TABLE",
  INVALID_PATTERN_ID: "INVALID_PATTERN_ID",

  UNAUTHORIZED: "UNAUTHORIZED",
  INVALID_TOKEN: "INVALID_TOKEN",

  INVALID_PARAMETER: "INVALID_PARAMETER",
  INVALID_RTP: "INVALID_RTP",
  INVALID_AGENT: "INVALID_AGENT",
  INVALID_GAME: "INVALID_GAME",
  INVALID_PLAYER: "INVALID_PLAYER",
  INVALID_LANG: "INVALID_LANG",
  INVALID_CURRENCY: "INVALID_CURRENCY",

  PO_GAME: "PO_GAME",

  INVALID_CALL: "INVALID_CALL",
  NO_PURCHASE_CALL_DATA: "NO_PURCHASE_CALL_DATA",
  DUPLICATED_REQUEST: "DUPLICATED CALL REQUEST",

  HACKING_WARNING: "HACKING DETECTED",
};

exports.CALL_CONSTANTS = {
  TYPE_BUY: 2,
  TYPE_NORMAL: 1,
  STATUS_WAITING: 0,
  STATUS_REJECTED: 3,
  STATUS_FINISHED: 2,
  STATUS_PROCESSING: 1,
};

exports.RESPONSE_CODE = {
  SUCCESS: 1,
  FAIL: 0,
};

exports.STATUS_CODE = {
  HTTP_OK: 200,
  HTTP_CREATED: 201,
  HTTP_ACCEPTED: 202,
  HTTP_NON_AUTHORITATIVE_INFORMATION: 203,
  HTTP_NO_CONTENT: 204,
  HTTP_RESET_CONTENT: 205,
  HTTP_PARTIAL_CONTENT: 206,
  HTTP_MULTIPLE_CHOICES: 300,
  HTTP_MOVED_PERMANENTLY: 301,
  HTTP_FOUND: 302,
  HTTP_SEE_OTHER: 303,
  HTTP_NOT_MODIFIED: 304,
  HTTP_USE_PROXY: 305,
  HTTP_UNUSED: 306,
  HTTP_TEMPORARY_REDIRECT: 307,
  HTTP_BAD_REQUEST: 400,
  HTTP_UNAUTHORIZED: 401,
  HTTP_PAYMENT_REQUIRED: 402,
  HTTP_FORBIDDEN: 403,
  HTTP_NOT_FOUND: 404,
  HTTP_METHOD_NOT_ALLOWED: 405,
  HTTP_NOT_ACCEPTABLE: 406,
  HTTP_PROXY_AUTHENTICATION_REQUIRED: 407,
  HTTP_REQUEST_TIMEOUT: 408,
  HTTP_CONFLICT: 409,
  HTTP_GONE: 410,
  HTTP_LENGTH_REQUIRED: 411,
  HTTP_PRECONDITION_REQUIRED: 412,
  HTTP_REQUEST_ENTRY_TOO_LARGE: 413,
  HTTP_REQUEST_URI_TOO_LONG: 414,
  HTTP_UNSUPPORTED_MEDIA_TYPE: 415,
  HTTP_REQUESTED_RANGE_NOT_SATISFIABLE: 416,
  HTTP_EXPECTATION_FAILED: 417,
  HTTP_I_M_A_TEAPOT: 418,
  HTTP_INTERNAL_SERVER_ERROR: 500,
  HTTP_NOT_IMPLEMENTED: 501,
  HTTP_BAD_GATE_WAY: 502,
  HTTP_SERVICE_UNAVAILABLE: 503,
  HTTP_GATEWAY_TIMEOUT: 504,
  HTTP_VERSION_NOT_SUPPORTED: 505,
  RESPONSE_OK: 1,
  RESPONSE_ERROR: 0,
};

exports.GAME_ERR_MSG = {
  MAINTENANCING: {
    en: "Maintenancing... Please try again later.",
  },
  SERVER_ERROR: {
    en: "Sorry... Server Error",
  },
  HISTORY_ERROR: {
    en: "No any history.",
  },
  NETWORK_ERROR: {
    en: "Network Error",
  },
  INSUFFICIENT_USER_FUNDS: {
    en: "Please charge your cash to bet.",
  },
  INSUFFICIENT_AGENT_FUNDS: {
    en: "Insufficient funds to bet.",
  },
  INSUFFICIENT_SUB_FUNDS: {
    en: "Please charge sub agent cash to bet.",
  },
  INVALID_TOKEN: {
    en: "Invalid Token",
  },
  INVALID_ERROR: {
    en: "Sorry, Invalid Error",
  },
  GAME_CREDIT_ERROR: {
    en: "Sorry, Game Credit Error",
  },
  AGENT_SEND_EVENT_RETURN_ERROR: {
    en: "Sorry, The agent received the event and returned an error callback. Please reload.",
  },
  AGENT_SEND_EVENT_ERROR: {
    en: "Sorry, The seamless agent returned an error callback. Please reload.",
  },
  AGENT_SEND_EVENT_NETWORK_ERROR: {
    en: "Sorry, A network error occurred while sending events to the Seamless agent. Please reload.",
  },
};

exports.GAME_RESPONSE_CODE = {
  SUCCESS_CODE: 200,
  ERROR_MODAL_CODE: 412,
  ERROR_TOAST_CODE: 300,
};
