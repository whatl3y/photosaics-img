var async = require('async')
var AwsS3 = require('../libs/AwsS3')
var ImageHelpers = require('../libs/ImageHelpers')
var config = require("../config.js")
var log = require('bunyan').createLogger(config.logger.options)

const s3 = new AwsS3()

module.exports = function(req,res) {
  var info = req.body
  if (info.file) {
    var fileInfo = info.file
    var fileName = fileInfo.name
    var filePath = fileInfo.path
    var fileType = fileInfo.type
  } else {
    return res.status(500).json({error: new Error(`No file provided to upload.`).toString()})
  }

  async.waterfall([
    function(callback) {
      new ImageHelpers().rotateImagePerExifOrientation('fs',filePath,callback)
    },
    function(finalLwipImage,callback) {
      finalLwipImage.toBuffer(ImageHelpers.getImageTypeFromFile(fileName),callback)
    },
    function(newImageBuffer,callback) {
      s3.writeFile({
        filename: fileName,
        data: newImageBuffer
      },callback)
    }
  ],
    function(err,s3FileName) {
      if (err) {
        res.status(500).json({error: new Error(`There was an error uploading your file. Please try again.`).toString()})
        return log.error(err)
      }
      return res.json({filename: s3FileName})
    }
  )
}
