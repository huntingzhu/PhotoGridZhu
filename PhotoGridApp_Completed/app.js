'use strict'

var express = require('express');
var path = require('path');
var config = require('./config'); // Configuration information
var knox = require('knox');
var fs = require('fs');
var os = require('os');
var formidable = require('formidable'); // Form processing library
var gm = require('gm'); // GraphicsMagick
var mongoose = require('mongoose').connect(config.dbURL);

// Set our express server
var app = express();
app.set('views', path.join(__dirname, 'views')); // Set the views folder
app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public'))); // Set the public folder
app.set('port', process.env.PORT || 3000);
app.set('host', config.host);

var knoxClient = knox.createClient({  // This is used to connect to our AWS S3 bucket
    key: config.S3AccessKey,
    secret: config.S3Secret,
    bucket: config.S3Bucket
});

var server = require('http').createServer(app);
var io = require('socket.io')(server);

require('./routes')(express, app, formidable, fs, os, gm, knoxClient, mongoose, io);

server.listen(app.get('port'), function() {
    console.log('PhotoGrid is running on port: ' + app.get('port'));
});