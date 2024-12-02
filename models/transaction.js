const crypto = require("crypto");
const main  = require("../config/preference")
const {calculateCrashMultiplier, randomInt, enc, dec} = require("../utils/random")

module.exports = (sequelize, Sequelize) => {
  const Transaction = sequelize.define(
    "transaction",
    {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      hash: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: '',
      },
      is_used:{
        type: Sequelize.SMALLINT,
        allowNull: false,
        defaultValue: 0,
      },
      init_seed: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: '',
      }
    },
    {
      timestamps: true,
      tableName: 'originals_crash_transaction', // Prefixing the table name as per your requirement  
    }
  );

  Transaction.migrate = async (p) => {
    const count = await Transaction.count();   

    if (count == 0) {
      await Transaction.destroy({ truncate: true });     
      
      let currentState = {};  

      // Capture the current time for seed generation.  
      const currentTime = Date.now();  

      // Generate a random number for additional entropy.  
      const randomValue = randomInt(1, 10000000);  

      // Create an initial seed using SHA-256 based on the current time and random value.  
      const initialSeed = crypto.createHash('sha256')  
                            .update(`${currentTime}:${randomValue}`)  
                            .digest('hex');  

      // Convert the maximum number of turns from a string to a number.  
      const maxTurns = Number(main.max_turns);  

      // Calculate the number of batches needed, each handling up to 10,000 records.  
      const numBatches = Math.ceil(maxTurns / 10000);  

      for (let i = 0; i < numBatches; i++) {  
        // Prepare a list to hold the records for this batch.  
        const recordsBatch = [];  

        // Calculate the size of the current batch (it may be less than 10,000 for the last batch).  
        const batchSize = (i === numBatches - 1) ? maxTurns % 10000 : 10000;  

        for (let j = 0; j < batchSize; j++) {  
          const index = i * 10000 + j;  

          // Calculate crash multiplier, initializing it with the seed for the first index, then using the previous hash.  
          currentState = index === 0  
            ? calculateCrashMultiplier(initialSeed)  
            : calculateCrashMultiplier(currentState.hash);  

          // Append the new record to the batch array with its unique conditions.  
          recordsBatch.push({  
            id: maxTurns - index,  
            hash: enc(currentState.hash),  
            init_seed: index === 0 ? enc(`${initialSeed}-${currentTime}-${randomValue}`) : ''  
          });  
        }  

        // Perform bulk creation of the records in the database.  
        await Transaction.bulkCreate(recordsBatch);  
      }                 
    }
   
  };


  return Transaction;
};
