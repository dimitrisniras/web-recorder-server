# Web Recorder Server
Web Recorder is an automated website testing and monitoring service that checks for problems with your website or application. It carries out operations in a browser, the same way a user would, to ensure that everything is working properly. More information about Web Recorder functionality and it's API can be found [here][documentation].

Web Recorder's Server consists of two parts: Frontend for the visual representation of tests and Backend for the automation tests logic. You can access the Web Recorder's Application from [here][website] and the API from http://snf-766614.vm.okeanos.grnet.gr:4000.

[documentation]: http://snf-766614.vm.okeanos.grnet.gr:8080/documentation
[website]: http://snf-766614.vm.okeanos.grnet.gr:8080
[api]: http://snf-766614.vm.okeanos.grnet.gr:4000

## Manual Installation
If you want to install locally to your PC either the Web Application or the app's backend you have to install Node via npm:
```
$ curl -sL https://deb.nodesource.com/setup_6.x | sudo -E bash -
$ sudo apt-get install -y nodejs
```
To compile and install native addons from npm you also need to install build tools:
```
$ sudo apt-get install -y build-essential
```

More information about frontend and backend installation you can find in the sub-folders.
