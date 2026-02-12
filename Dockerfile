FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install --production

COPY serviceAccountKey.json ./serviceAccountKey.json

COPY . .

EXPOSE 3000

CMD ["node", "src/server.js"]