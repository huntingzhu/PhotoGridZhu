'use strict';

if(process.env.NODE_ENV === 'production') {
    // Offer production stage environment variables

    module.exports = {
        host: process.env.host || "",
        S3AccessKey: process.env.S3AccessKey,
        S3Secret: process.env.S3Secret,
        S3Bucket: process.env.S3Bucket,
        dbURL: process.env.dbURL
    };
} else {
    // Offer dev stage settings and data
    module.exports = require('./development.json');
}