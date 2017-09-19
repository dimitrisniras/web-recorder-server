# Web Recorder Frontend

Web Recorder's frontend is responsible for the presentation of tests results, steps editing, suite scheduling and more. You can access Web Recorder's website from [here](http://snf-766614.vm.okeanos.grnet.gr:8080) or you can install it locally. More information about Web Recorder's functionality can be found [here](http://snf-766614.vm.okeanos.grnet.gr:8080/documentation).

## Installation
### Manual installation
In order to install Web Recorder's frontend locally to your PC you have to previously install Angular CLI, typing this command:
```
$ sudo npm install -g @angular/cli
```

After Angular CLI installation, you have to install all the required packages needed for deployment, running this command to frontend folder:
```
$ npm install
```

Then it's time to build the application, using `--prod` flag for production use and `--aot` flag so that the compiler runs once at build time using one set of libraries:
```
$ ng build --prod --aot
```

#### Running
Having installed all the required packages and built the application, it's time to run it. There are two options to run:
1) Using `$ ng serve`. The application will listen by default to port 4200. You can change listening port with `--port <port>` flag. It is recommended to use 8080 port so you don't have to change listening URL to backend files.
2) Using `$ node server.js`. The application will listen to 8080 port. In order ro change it you have to modify `server.js` file:
```
...
app.listen(8080, function() {
    console.log('Frontend app listening on port 8080!');
});
```

You can run `server.js` using also [nodemon][nodemon] or [forever][forever].

[nodemon]: https://github.com/remy/nodemon
[forever]: https://www.npmjs.com/package/forever

If you have installed locally or in your server the app's backend, you have to modify it's listening URL on `src/app/services/auth.service.ts` file:
```
import { Injectable } from '@angular/core';
import { Http, Headers, Response } from '@angular/http';
import { Router } from '@angular/router';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/operator/map';

@Injectable()
export class AuthService {
  serverURL = 'http://localhost:4000/';
...
```
and on `src/app/services/posts.service.ts` file:
```
import { Injectable } from '@angular/core';
import { Http, Headers, RequestOptions, Response } from '@angular/http';
import { User } from '../user';

@Injectable()
export class PostsService {
  serverURL = 'http://localhost:4000/';
...
```

### Docker installation
There is a more simple way to install Web Recorder's frontend locally in your PC through a Docker container. At first you need to install docker. Please follow the [very good instructions](https://docs.docker.com/engine/installation/) from the Docker project.

#### Running
After the successful installation, all you need to do is:
```
$ docker run -d -p <your-port>:8080 --name <your-container-name> webrecordergr/web-recorder-frontend
```

It is recommended to run your frontend's image on port 8080 in order to connect directly with Web Recorder's backend without any modification.
