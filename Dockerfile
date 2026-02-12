FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install --production

COPY . .

EXPOSE 3000

# Perintah untuk menjalankan aplikasi
CMD ["node", "src/server.js"]