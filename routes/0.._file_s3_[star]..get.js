var async = require('async')
var streamifier = require('streamifier')
var AWS = require('aws-sdk')
var config = require('../config')

var s3 = new AWS.S3()

module.exports = function(req,res) {
  var bucket = config.aws.s3.bucket
  var filename = req.params[0]
  var params = {Bucket: bucket, Key: filename}
  s3.getObject(params).createReadStream().pipe(res)
}
