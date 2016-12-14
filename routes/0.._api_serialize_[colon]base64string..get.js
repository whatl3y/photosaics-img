var async = require('async')
var Encryption = require('../libs/Encryption')
var config = require("../config.js")
var log = require('bunyan').createLogger(config.logger.options)

const enc = new Encryption()

module.exports = function(req,res) {
  const base64string = req.params.base64string
  const stringToHash = new Buffer(base64string, 'base64').toString()
  return res.json({string: enc.encrypt(stringToHash)})
}
