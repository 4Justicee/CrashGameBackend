const config = require("../config/preference");
const crashController = require("../controllers/crash")
const WebSocket = require('ws');

const clients = new Set();  

async function connectWebSocket () {
  try {
    const port = config.gamePort;
    const wss = new WebSocket.Server({ port });
    wss.on('connection', (ws) => {
        console.log('New client connected!');
        clients.add(ws);  // Add new client to the set  

        ws.on('message', (message) => {                        
          const o = JSON.parse(message);
          if(o.type == 'authenticate') {
            crashController.authenticate(ws);
          }
          if(o.type == 'login') {
            crashController.login(ws, o);
          }
          if(o.type == 'placeBet') {
            crashController.placeBet(ws, o);
          }
          if(o.type == 'cashOut') {
            crashController.cashOut(ws, o);
          }
          if(o.type == 'cancelBet') {
            crashController.cancelBet(ws, o);
          }
          if(o.type == 'autoBet') {
            crashController.autoBet(ws, o);
          }
          if(o.type == 'cancelAutoBet') {
            crashController.cancelAutoBet(ws, o);
          }
        });
      
        // Handle client disconnection
        ws.on('close', () => {
          console.log('Client disconnected');
          clients.delete(ws);  // Add new client to the set  
          console.log("connected users:",clients.size);
        });
    });
  } catch (error) {
    console.log(error);
    process.exit(0);
  } 
};

function broadcastMessage(message) {  
  for (const client of clients) {  
      if (client.readyState === WebSocket.OPEN) {  
          client.send(message);  
      }  
  }  
}  

module.exports = { 
  connectWebSocket,
  broadcastMessage,    
  getClients: () => clients  // Optionally, provide a getter for the clients set  
};