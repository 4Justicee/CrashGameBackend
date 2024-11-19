const crypto = require("crypto");

exports.random = function (min, max) {
  let result = min + Math.random() * (max - min);
  return result;
};
exports.randomFromZeroToOne = () => {
  const buffer = crypto.randomBytes(4);                                
  const randomInt = buffer.readUInt32BE(0);                  
                           
  return randomInt / 0xffffffff;
};

exports.randomInt = (min, max) => {
  let result = min + Math.floor(this.randomFromZeroToOne() * (max - min));
  return result;
};

function generateHash(seed) {  
  return crypto.createHash('sha256').update(seed).digest('hex');  
}  

exports.calculateCrashMultiplier = (serverSeed)=>{  
  const hash = generateHash(serverSeed);  
  const hex = hash.substring(0, 13);  
  const decimalValue = parseInt(hex, 16);  

  const CRASH_POINT_DIVISOR = 2 ** 52;  
  const crashPoint = Math.floor((100 * CRASH_POINT_DIVISOR) / (CRASH_POINT_DIVISOR - decimalValue)) / 100;  
  return {crashPoint, hash};  
} 
