FROM node:12

# Create app directory
WORKDIR /usr/src/app


# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./

RUN mkdir -p /usr/src/app
RUN mkdir -p /usr/src/static

COPY dist /usr/src/app/

COPY static /usr/src/static/

EXPOSE 4000

CMD [ "node", "index.js" ]

