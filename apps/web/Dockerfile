FROM node:20-alpine

WORKDIR /workspace

COPY package.json tsconfig.base.json ./
COPY apps/web/package.json apps/web/package.json

RUN npm install

COPY apps/web apps/web

WORKDIR /workspace/apps/web

CMD ["npm", "run", "dev"]
