require('rootpath')();
var express = require('express');
var app = express();
var cors = require('cors');
var bodyParser = require('body-parser');
var expressJwt = require('express-jwt');
var config = require('config.json');

app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// use JWT auth to secure the api
app.use(expressJwt({ secret: config.secret }).unless({ path: ['/authenticate', '/register', '/forgot-password', /^\/reset-password\/.*/] }));

// routes
app.use('/', require('./controllers/users.controller'));

// start server
var port = 4000;
var server = app.listen(port, function () {
    console.log('Server listening on port ' + port);
});

