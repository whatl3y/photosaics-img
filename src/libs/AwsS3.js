import * as fs from 'fs'
import * as AWS from 'aws-sdk'
import async_waterfall from 'async/waterfall'
import ApiHandler from './ApiHandler'
import FileHelpers from './FileHelpers'
import * as config from '../config'

export default class AwsS3 extends FileHelpers {
  constructor(options) {
    super(options)
    options = options || {}
    this.defaultbucket = options.bucket || config.aws.s3.bucket
    this._s3 = new AWS.S3()
  }

  getFile(options, callback) {
    const filename = options.filename
    const bucket = options.bucket || this.defaultbucket
    const extraOptions = options.options || {}
    const params = ApiHandler.mergeObject({Bucket: bucket, Key: filename},extraOptions)
    // Note the raw buffer data in the file is returned in callback(err,data) {}
    // as data.Body
    this._s3.getObject(params,callback)
  }

  getFileUrl(options, callback) {
    const filename = options.filename
    const bucket = options.bucket || this.defaultbucket
    const params = {Bucket: bucket, Key: filename}
    this._s3.getSignedUrl('getObject',params,callback)
  }

  writeFile(options, callback) {
    const bucket = options.bucket || this.defaultbucket
    const data = options.data
    const filename = (!options.exact_filename) ? this.fileName(options.filename) : options.filename
    const params = {Bucket: bucket, Key: filename, Body: data}
    this._s3.putObject(params, function(err,returnedData) {
      return callback(err,filename)
    })
  }

  writeFileFromFilePath(options, callback) {
    const self = this
    const bucket = options.bucket || this.defaultbucket
    const filePath = options.path
    const filename = (!options.exact_filename) ? this.fileName(filePath) : filePath
    let params = {Bucket: bucket, Key: filename}
    async_waterfall([
      function(_callback) {
        fs.readFile(filePath,_callback)
      },
      function(bufferData,_callback) {
        params.Body = bufferData
        self.writeFile({
          bucket: bucket,
          filename: filename,
          exact_filename: true,
          data: bufferData
        },_callback)
      }
    ],
      function(err,result) {
        return callback(err,result)
      }
    )
  }

  createBucket(bucketName, callback) {
    this._s3.createBucket({Bucket: bucketName}, callback)
  }
}

module.exports = AwsS3
