FROM node:12.19-alpine3.12

COPY lib/dist /build/lib/dist
COPY docs/ /usr/src/static/docs/
COPY frontend/ /usr/src/static/
COPY backend/dist/ /usr/src/app/
COPY backend/package.json backend/package-lock.json backend/gulpfile.js /build/backend/

RUN cd /build/backend/ \
    && npm ci \
    && npx copy-node-modules ./ dist/ \
    && cp -R ../lib/dist dist/node_modules/datapm-lib \
    && cp -R /build/backend/dist/node_modules /usr/src/app \
    && rm -rf /build

EXPOSE 4000
WORKDIR /usr/src/app

CMD [ "node", "index.js" ]

