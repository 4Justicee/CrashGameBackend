const config = require("../config/preference");
const WebSocket = require('ws');

const clients = new Set();  

async function connectWebSocket () {
  try {
    const port = config.gamePort;
    const wss = new WebSocket.Server({
      port, path: `/${config.api.family}/${config.api.endPoint}/${config.api.version}`
    });
    console.log('websocket started', port);
    wss.on('connection', (ws, req) => {        
        console.log('New client connected!');
        clients.add(ws);  // Add new client to the set  

        ws.on('message', (message) => {                        

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