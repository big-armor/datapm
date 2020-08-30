FROM node:12

RUN node --version
RUN npm --version

RUN mkdir -p /usr/src/build
RUN mkdir -p /usr/src/build

RUN mkdir -p /usr/src/app
RUN mkdir -p /usr/src/static

WORKDIR /usr/src/build

COPY ./ /usr/src/build

WORKDIR /usr/src/build/backend/

RUN npm ci

RUN npm run build

RUN cp  -R ./dist/* /usr/src/app

WORKDIR /usr/src/build/frontend/

RUN ls src/environments/*

RUN npm ci

RUN npm run build

RUN cp  -R ./dist/* /usr/src/static

RUN rm -rf /usr/src/build

WORKDIR /usr/src/app

EXPOSE 4000

CMD [ "node", "index.js" ]

