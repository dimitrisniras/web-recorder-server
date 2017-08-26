var express = require('express');
var app = express();
var path = require('path');

app.use(express.static('dist'));
app.get('*', function(req, res) {
  res.sendFile(__dirname + '/dist/' + 'index.html')
});

app.listen(8080, function() {
    console.log('Frontend app listening on port 8080!');
});

