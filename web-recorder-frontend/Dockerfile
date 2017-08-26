FROM node:boron

# Create web-recorder-frontend directory
RUN mkdir -p /usr/src/web-recorder-frontend
WORKDIR /usr/src/web-recorder-frontend

# Install Angular 4 cli
RUN npm install -g @angular/cli

# Install app dependencies
COPY package.json /usr/src/web-recorder-frontend/
RUN npm install

# Bundle app source
COPY . /usr/src/web-recorder-frontend

# Build frontend
RUN ng build --prod --aot

EXPOSE 8080
CMD [ "node", "server.js" ]

