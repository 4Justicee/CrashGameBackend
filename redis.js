const redis = require("redis");
const config = require("./config/preference");

let redisClient = {};

exports.connectRedis = async () => {
    redisClient = redis.createClient({ url: `redis://${config.redis.host}:${config.redis.port}` });  

    redisClient.on('error', (err) => {  
        console.log("Redis Client Error", err);  
        // Implement reconnection logic or other fallbacks  
    });  

    await redisClient.connect();  
    return redisClient; 
};

exports.getValue = (key) => {
    return new Promise((resolve) => {
        redisClient.get(key, (err, data) => {
            if (err) {
                console("error", "Redis", err.message);
                resolve(null);
            }

            if (data != null) {
                resolve(data);
            } else {
                resolve(null);
            }
        });
    });
};

exports.setValue = async (key, string) => {
    await redisClient.set(key, string);
};

exports.setJsonValue = async (key, data) => {
    await redisClient.set(key, JSON.stringify(data));
};

exports.flushDB = () => {
    redisClient.flushdb(function (error, result) {
        console("info", "Redis", `Flush Result... ${JSON.stringify(result)}`);
    });
};
