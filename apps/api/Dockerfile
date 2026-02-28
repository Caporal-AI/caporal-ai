FROM node:20-alpine

WORKDIR /workspace

COPY package.json tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/contracts/package.json packages/contracts/package.json

RUN npm install

COPY apps/api apps/api
COPY packages/contracts packages/contracts

WORKDIR /workspace/apps/api

CMD ["sh", "-c", "npm run migration:run && npm run start:dev"]
