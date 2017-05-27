'use strict';

module.exports = function(express, app, formidable, fs, os, gm, knoxClient, mongoose, io) {

    var photoSocket;

    io.on('connection', function(socket) {
        photoSocket = socket;
    });

    var singleImage = new mongoose.Schema({
        filename: String,
        imageurl: String,
        votes: Number
    });

    var singleImageModel = mongoose.model('singleImage', singleImage);

    var router = express.Router();

    router.get('/', function(req, res, next) {
        res.render('index', {host: app.get('host')});
    });

    router.get('/getimages', function(req, res, next) {
        singleImageModel.find({}, null, {sort: {votes: -1}}, function(error, result) {
            res.status(200).send(JSON.stringify(result));
        });
        // singleImageModel.find({}).sort({votes: 1}).exec(function(error, result) {
        //     res.status(200).send(JSON.stringify(result));
        // });

    });

    router.get('/voteup/:id', function(req, res, next) {
        singleImageModel.findByIdAndUpdate(req.params.id, {$inc:{votes:1}}, function(error, result) {
            res.status(200).send({votes:result.votes});
        });
    });

    router.post('/upload', function(req, res, next) {
        // File upload

        function generateFilename(filename) {
            var ext_regex = /(?:\.([^.]+))?$/;
            var ext = ext_regex.exec(filename)[1];
            var date = new Date().getTime();
            var charBank = "abcdefghijklmnopqrstuvwxyz";
            var fstring = '';
            for(var i = 0; i < 15; i++) {
                fstring += charBank[parseInt(Math.random() * 26)];
            }

            return (fstring += date + '.' + ext);
        }

        var tmpFile, nfile, fname;
        var newForm = new formidable.IncomingForm();
        newForm.keepExtensions = true;
        newForm.parse(req, function(err, fields, files) {
            tmpFile = files.upload.path;
            fname = generateFilename(files.upload.name);
            nfile = os.tmpdir() + '/' + fname;
            res.writeHead(200, {'Content-type': 'text/plain'});
            res.end();
        });

        newForm.on('end', function() {
            fs.rename(tmpFile, nfile, function() {
                // Reseize the image and upload this file into the S3 bucket
                gm(nfile).resize(300).write(nfile, function() { // Rewrite the file when finished resizing
                    // Upload to the S3 server
                    fs.readFile(nfile, function(error, buffer) {
                        var req = knoxClient.put(fname, {
                            'Content-Length': buffer.length,
                            'Content-Type': 'image/jpeg'
                        });

                        req.on('response', function(res) {
                            if(res.statusCode == 200) {
                                // This means that the file is in the S3 Bucket!
                                var newImage = new singleImageModel({
                                    filename: fname,
                                    imageurl: 'https://d3hrkag20mcu4k.cloudfront.net/' + fname,
                                    votes: 0
                                }).save();

                                photoSocket.emit('status', {
                                    'msg': 'Saved!!!',
                                    'delay': 3000
                                });

                                photoSocket.emit('doUpdate', {});

                                // Delete the local File
                                fs.unlink(nfile, function() {
                                    console.log('Local file is deleted!!!');
                                });


                            }
                        });

                        req.end(buffer);
                    });

                });
            });
        });

    });

    app.use('/', router);
}

