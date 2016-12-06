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

  getFileExists(options, callback) {
    const filename = options.Key || options.filename
    const bucket = options.Bucket || options.bucket || this.defaultbucket
    const params = {Bucket: bucket, Key: filename}
    this._s3.headObject(params,function(err, result) {
      if (err && err.code === 'NotFound') return callback(null,false)
      if (err) return callback(err)
      return callback(null,true)
    })
  }

  getFile(options, callback) {
    const filename = options.Key || options.filename
    const bucket = options.Bucket || options.bucket || this.defaultbucket
    const extraOptions = options.options || {}
    const params = ApiHandler.mergeObject({Bucket: bucket, Key: filename},extraOptions)
    // Note the raw buffer data in the file is returned in callback(err,data) {}
    // as data.Body
    this._s3.getObject(params,callback)
  }

  getFileUrl(options, callback) {
    const filename = options.Key || options.filename
    const bucket = options.Bucket || options.bucket || this.defaultbucket
    const params = {Bucket: bucket, Key: filename}
    this._s3.getSignedUrl('getObject',params,callback)
  }

  writeFile(options, callback) {
    const bucket = options.Bucket || options.bucket || this.defaultbucket
    const data = options.data
    let filename = options.Key || options.filename
    filename = (!options.exact_filename) ? this.fileName(filename) : filename
    const params = {Bucket: bucket, Key: filename, Body: data}
    this._s3.putObject(params, function(err,returnedData) {
      return callback(err,filename)
    })
  }

  writeFileFromFilePath(options, callback) {
    const self = this
    const bucket = options.Bucket || options.bucket || this.defaultbucket
    const filePath = options.path
    let filename = options.Key || options.filename
    filename = (!options.exact_filename) ? this.fileName(filename) : filename
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
