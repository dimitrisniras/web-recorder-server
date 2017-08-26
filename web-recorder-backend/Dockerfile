FROM node:boron

# Create web-recorder-backend directory
RUN mkdir -p /usr/src/web-recorder-backend
WORKDIR /usr/src/web-recorder-backend

# Install app dependencies
COPY package.json /usr/src/web-recorder-backend/
RUN npm install

# Bundle app source
COPY . /usr/src/web-recorder-backend

EXPOSE 4000
CMD [ "npm", "start" ]

