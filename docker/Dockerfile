FROM node:12

WORKDIR /usr/src/app

RUN mkdir -p /usr/src/app
RUN mkdir -p /usr/src/static

RUN npm install -g gulp

RUN mkdir -p /build/lib
COPY lib /build/lib
RUN cd /build/lib/ && npm ci
RUN cd /build/lib/ && npm run build


RUN mkdir -p /build/backend
COPY backend/package.json backend/package-lock.json backend/gulpfile.js /build/backend/
RUN cd /build/backend/ && npm ci
RUN cd /build/backend/ && gulp copyDependencies


COPY backend/dist/ /usr/src/app/

RUN rm -rf /usr/src/app/node_modules

RUN cp -R /build/backend/dist/node_modules /usr/src/app

COPY frontend/dist/ /usr/src/static/

COPY docs/website/build/datapm /usr/src/static/docs/


EXPOSE 4000

CMD [ "node", "index.js" ]

