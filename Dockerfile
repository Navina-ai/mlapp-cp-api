FROM node:alpine

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./

# commands.sh
COPY commands.sh /commands.sh 
RUN chmod +x /commands.sh

# wait-for-it.sh
COPY wait-for-it.sh /wait-for-it.sh
RUN chmod +x /wait-for-it.sh

RUN npm ci --only=production

# Bundle app source
COPY . .

RUN apk update && apk upgrade && apk add bash

RUN adduser --disabled-password appuser && chown -R appuser /usr/src/app
USER appuser

EXPOSE 3000
ENTRYPOINT [ "/bin/bash" ]
CMD [ "/commands.sh" ]