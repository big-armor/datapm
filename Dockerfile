FROM node:12

# Create app directory
WORKDIR /usr/src/app

RUN mkdir -p /usr/src/app
RUN mkdir -p /usr/src/static

COPY backend/dist /usr/src/app/

COPY frontend/dist /usr/src/static/

EXPOSE 4000

CMD [ "node", "index.js" ]

