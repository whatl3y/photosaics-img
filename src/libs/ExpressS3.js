import * as fs from 'fs'
import ApiHandler from './ApiHandler'
import AwsS3 from './AwsS3'
import ImageProcessor from './ImageProcessor'
import Encryption from './Encryption'
import * as config from '../config'
import async_waterfall from 'async/waterfall'

export { ExpressS3 as default }

const enc = new Encryption()
const s3 = new AwsS3()

const ExpressS3 = {
  checkObjectMiddleware: function(req, res, next) {
    const command = req.params.command
    let url = req.params[0]
    let params

    try {
      params = req.params.params
      if (params !== '*') {
        params = enc.decrypt(params)
      }
    } catch(e) {
      console.log("Error decrypting:",e)
      return res.status(500).send("Please make sure you have to correct URL and try again.")
    }

    // If the url has a query string, append it to the URL since
    // it isn't included in the params[0] wildcard object from express
    if (Object.keys(req.query).length > 0) {
      url += `?${ApiHandler.serialize(req.query)}`
    }

    if (ExpressS3.isValidParams(command, params, url)) {
      let filename, oParams
      [filename, oParams] = ExpressS3.parseObjectName(command, params, url)

      if (filename) {
        const bucket = config.aws.s3.bucket
        const s3Params = {Bucket: bucket, Key: filename}
        async_waterfall([
          function(callback) {
            s3.getFileExists(s3Params, callback)
          }
        ],
          function(err,doesExist) {
            if (err) return res.status(500).send(err.toString())

            req.s3_filename = filename
            req.parsedObjectParams = oParams
            if (doesExist) req.s3_params = s3Params
            return next()
          }
        )
      } else {
        return res.status(500).send('There was a problem parsing your URI. Please confirm you have no errors and try again.')
      }
    } else {
      return res.status(500).send('Invalid path. Please ensure your path is in the format /:command/:parameters/:url_to_image')
    }
  },

  isValidParams: function(command, params, url) {
    if (command && params && url) {
      if (url.indexOf('http://') > -1 || url.indexOf('https://') > -1) {
        return true
      }
      return false
    }
    return false
  },

  parseObjectName: function(command, params, url) {
    try {
      const commands = command.replace(new RegExp(`([^${ImageProcessor.commandKeys()}])`, 'g'), '')
      const parsedParams = ExpressS3.parseParams(params)

      // Of all the params provided, make sure there exists the command
      // in the list of commands to process
      for (var _command in parsedParams) {
        if (commands.indexOf(_command) === -1) {
          delete(parsedParams[_command])
        }
      }
      const paramsHash = enc.encrypt(encodeURIComponent(JSON.stringify(parsedParams)))
      return [`${commands}|${paramsHash}|${url.replace('://','___')}`, parsedParams]

    } catch(err) {
      console.log("Error parsing info:",err,command,params,url)
      return false
    }
  },

  parseParams(params) {
    let parsedParams
    try {
      if (params === '*') return {}
      parsedParams = JSON.parse(decodeURIComponent(params))
    } catch(e) {
      console.log(`Error parsing params: ${e}`)
      parsedParams = {}
    }
    return parsedParams
  }
}

module.exports = ExpressS3
