FROM node:12

# Create app directory
WORKDIR /usr/src/app

# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./

COPY dist ./

EXPOSE 4000

CMD [ "node", "main.js" ]

