FROM node:12

WORKDIR /usr/src/app

RUN mkdir -p /usr/src/app
RUN mkdir -p /usr/src/static

COPY backend/dist/ /usr/src/app/

COPY frontend/dist/ /usr/src/static/

COPY docs/website/build/datapm /usr/src/static/docs/


EXPOSE 4000

CMD [ "node", "index.js" ]

