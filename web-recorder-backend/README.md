# Web Recorder Backend
Backend represents all the logic behind the scenes. It is responsible for test running and scheduling. Backend's API can be accessed from http://snf-766614.vm.okeanos.grnet.gr:4000 or can be installed locally to your PC. You can see documentation's API [here][documentation].

[documentation]: http://snf-766614.vm.okeanos.grnet.gr:8080/documentation

## Installation
### Manual Installation
For manual installation you have to install these packages:
#### Selenium Wedriver using npm
```
$ npm install selenium-webdriver
```
#### MongoDB

 First you have to import the key for the official MongoDB repository.
```
$ sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv EA312927
```

Issue the following command to create a list file for MongoDB.
```
$ echo "deb http://repo.mongodb.org/apt/ubuntu xenial/mongodb-org/3.2 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-3.2.list
```

After adding the repository details, you need to update the packages list.
```
$ sudo apt-get update
```

Now you can install the MongoDB package itself.
```
$ sudo apt-get install -y mongodb-org
```

You'll create a unit file to manage the MongoDB service. Create a configuration file named mongodb.service in the /etc/systemd/system directory using nano or your favorite text editor.
```
$ sudo nano /etc/systemd/system/mongodb.service
```

Paste in the following contents, then save and close the file.
```
[Unit]
Description=High-performance, schema-free document-oriented database
After=network.target

[Service]
User=mongodb
ExecStart=/usr/bin/mongod --quiet --config /etc/mongod.conf

[Install]
WantedBy=multi-user.target
```

Next, start the newly created service with `systemctl`.
```
$ sudo systemctl start mongodb
```

While there is no output to this command, you can also use `systemctl` to check that the service has started properly.
```
$ sudo systemctl status mongodb
```

Output
```
● mongodb.service - High-performance, schema-free document-oriented database
   Loaded: loaded (/etc/systemd/system/mongodb.service; enabled; vendor preset: enabled)
   Active: active (running) since Mon 2016-04-25 14:57:20 EDT; 1min 30s ago
 Main PID: 4093 (mongod)
    Tasks: 16 (limit: 512)
   Memory: 47.1M
      CPU: 1.224s
   CGroup: /system.slice/mongodb.service
           └─4093 /usr/bin/mongod --quiet --config /etc/mongod.conf
```

The last step is to enable automatically starting MongoDB when the system starts.
```
$ sudo systemctl enable mongodb
```

#### Install Packages
After selenium and MongoDB installation you have to run `$ npm install` in backend folder in order to install all the required packages.

#### Running
Now you can run Web Recorder's API after having installed all required packages. In order to run API type this command:
```
$ node server.js
```
You can run `server.js` using also [nodemon][nodemon] or [forever][forever].

Server is now listening on port 4000 and can be accessed through http://localhost:4000. If you want to change listening port you have to modify it on `server.js` file:
```
...
// start server
var port = 4000;
var server = app.listen(port, function () {
    console.log('Server listening on port ' + port);
});
```

If you also have installed locally or in your server the app's frontend you have to modify it's listening URL on `services/user.service.js` file:
```
...
var db = mongo.db(config.connectionString, { native_parser: true });
var websiteURL = 'http://snf-766614.vm.okeanos.grnet.gr:8080/';
db.bind('users');

var service = {};
...
```

[nodemon]: https://github.com/remy/nodemon
[forever]: https://www.npmjs.com/package/forever



### Docker Installation
There is a more simple way to install Web Recorder's backend locally in your PC through a Docker container. At first you need to install docker. Please follow the [very good instructions](https://docs.docker.com/engine/installation/) from the Docker project. 

After the successful docker installation and before you install and run the Docker image you have to install MongoDB in your PC, following the previous steps, described in manual installation.

#### Running
Having installed MongoDB, you can now run the Web Recorder's backend Docker image typing this command:
```
$ sudo docker run -d -p <your-port>:4000 --name <your-container-name> webrecordergr/web-recorder:backend
```
It is recommended to run your backend's image on port 4000 in order to connect directly with Web Recorder's frontend without any modification.
