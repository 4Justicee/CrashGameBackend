ARG RUN_IMAGE=node:18-slim

# Build stage
FROM $RUN_IMAGE AS run-env  
RUN apt-get update && apt-get install -y curl  
RUN mkdir /app && chown node:node /app  
WORKDIR /app  
USER node  
COPY --chown=node:node package*.json ./  
RUN npm install  
COPY --chown=node:node . .  

EXPOSE 8088
EXPOSE 8089

CMD ["node", "index.js"]