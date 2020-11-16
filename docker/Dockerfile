FROM node:12.19-alpine3.12

COPY lib/dist /build/lib/dist
COPY docs/ /usr/src/static/docs/
COPY frontend/ /usr/src/static/
COPY backend/dist/ /usr/src/app/
COPY backend/package.json backend/package-lock.json backend/gulpfile.js /build/backend/

RUN npm install -g gulp \
    && cd /build/backend/ \
    && npm ci \
    && gulp copyDependencies \
    && cp -R /build/backend/dist/node_modules /usr/src/app \
    && rm -rf node_modules \
    && rm -rf /usr/local/lib/node_modules \
    && rm -rf /build

EXPOSE 4000

CMD [ "node", "index.js" ]

