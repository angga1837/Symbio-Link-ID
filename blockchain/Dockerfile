FROM node:18-alpine
WORKDIR /app
COPY package.json .
RUN npm install
COPY . .
# In-container default; local `npm start` uses 3001 in gateway.js to avoid clashing with Next.js on the host.
ENV PORT=3000
EXPOSE 3000
CMD ["node", "gateway.js"]
