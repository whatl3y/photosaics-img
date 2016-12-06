var async = require('async')
var streamifier = require('streamifier')
var AWS = require('aws-sdk')
var AwsS3 = require('../libs/AwsS3')
var ExpressS3 = require('../libs/ExpressS3')
var ImageProcessor = require('../libs/ImageProcessor')
var config = require('../config.js')
var log = require('bunyan').createLogger(config.logger.options)

var s3 = new AWS.S3()
var s3Int = new AwsS3()

module.exports = [
  ExpressS3.checkObjectMiddleware,
  function(req,res) {
    const filename = req.s3_filename
    let s3Params = req.s3_params
    if (s3Params) return s3.getObject(s3Params).createReadStream().pipe(res)

    const splitFileInfo = filename.split('|')
    const commands = splitFileInfo[0]
    const params = JSON.parse(decodeURIComponent(splitFileInfo[1]))
    const url = splitFileInfo[2].replace('___','://')

    const processor = new ImageProcessor(url)
    async.waterfall([
      function(callback) {
        processor.execute(commands, params, callback)
      },
      function(finalImageBuffer, callback) {
        async.parallel([
          function(_callback) {
            try {
              streamifier.createReadStream(finalImageBuffer).pipe(res)
              return _callback()
            } catch(e) {
              return _callback(e)
            }
          },
          function(_callback) {
            s3Params = {
              Bucket: config.aws.s3.bucket,
              Key: filename,
              exact_filename: true,
              data: finalImageBuffer
            }
            s3Int.writeFile(s3Params, _callback)
          }
        ],
          function(err,results) {
            return callback(err,results)
          }
        )
      }
    ],
      function(err,result) {
        if (err) {
          res.send(`There was an error processing your image: ${err.toString()}`)
          return log.error("Error processing and sending file:",err,filename)
        }
        log.info(`Successfully delivered file: ${filename}`)
      }
    )
  }
]
