const crypto = require("crypto");
const main = require("../config/preference")

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

exports.isSame = (value1, value2)=> {  
  return Math.abs(value1 - value2) < 1e-8;  
}  

exports.calculateCrashMultiplier = (serverSeed, salt="")=>{  
  const nBits = 52; // number of most significant bits to use

  const hash = generateHash(serverSeed+salt);  
  const hex = hash.substring(0, 13);  
  const decimalValue = parseInt(hex, 16);  

  let X = decimalValue / Math.pow(2, nBits); // uniformly distributed in [0; 1)
  X = parseFloat(X.toPrecision(9));

  X = main.rtp / (1 - X);

  const result = Math.floor(X);
  const crashPoint = Math.max(1, result / 100);

  return {crashPoint, hash};  
} 

exports.getValueFromHash = (hash) => {
  const nBits = 52; // number of most significant bits to use

  const hex = hash.substring(0, 13);  
  const decimalValue = parseInt(hex, 16);  

  let X = decimalValue / Math.pow(2, nBits); // uniformly distributed in [0; 1)
  X = parseFloat(X.toPrecision(9));

  X = main.rtp / (1 - X);

  const result = Math.floor(X);
  const crashPoint = Math.max(1, result / 100);

  return crashPoint;
}

exports.dec = (data) => {
  // Convert IV and Salt from Hex to Buffer
  const iv = Buffer.from([ 145, 59, 103, 222, 192, 13, 144, 27, 221, 97, 200, 205, 70, 32, 157, 117 ]); 
  const salt = Buffer.from([ 12, 184, 28, 45, 231, 233, 167, 152, 33, 150, 220, 92, 5, 31, 143, 217 ]);

  const key = crypto.pbkdf2Sync(main.secretKey, salt, 1000, 32, 'sha256');  // 32 bytes key

  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  let decrypted = decipher.update(data, 'base64', 'utf8');  
  decrypted += decipher.final('utf8');   
 

  return decrypted;
}

exports.enc = (data) => {
  const iv = Buffer.from([ 145, 59, 103, 222, 192, 13, 144, 27, 221, 97, 200, 205, 70, 32, 157, 117 ]); 
  const salt = Buffer.from([ 12, 184, 28, 45, 231, 233, 167, 152, 33, 150, 220, 92, 5, 31, 143, 217 ]);

  const key = crypto.pbkdf2Sync(main.secretKey, salt, 1000, 32, 'sha256');  // 32 bytes key
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(data, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  return encrypted;    

}