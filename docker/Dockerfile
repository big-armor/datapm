FROM node:16.14.2-bullseye-slim

COPY lib/dist /build/lib/dist
COPY client-lib/dist /build/client-lib/dist
COPY docs/ /usr/src/static/docs/
COPY frontend/ /usr/src/static/
COPY backend/dist/ /usr/src/app/
COPY client-installers /usr/src/app/client-installers/

RUN ls /usr/src/app/util/*

COPY backend/package.json backend/package-lock.json backend/gulpfile.js /build/backend/

RUN cd /build/backend/ \
    && npm ci \
    && npx copy-node-modules ./ dist/ \
    && cp -R ../lib/dist dist/node_modules/datapm-lib \
    && cp -R ../client-lib/dist dist/node_modules/datapm-client-lib \
    && cp -R /build/backend/dist/node_modules /usr/src/app \
    && rm -rf /build

EXPOSE 4000

WORKDIR /usr/src/app

CMD [ "sh", "/usr/src/app/startServer.sh" ]
