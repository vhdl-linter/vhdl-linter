FROM node:20.8.0-alpine3.17
WORKDIR /app
COPY package-lock.json .
COPY package.json .
RUN npm ci
COPY . /app
RUN npm run compile
RUN npm link
CMD [ "npx", "vhdl-linter" ]