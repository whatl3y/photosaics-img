var async = require('async')
var config = require("../config.js")
var log = require('bunyan').createLogger(config.logger.options)

module.exports = function(req,res) {
  const command = req.params.command
  const url = req.params[0]

  log.info(`command: ${command} -- url: ${url}`)
  res.send(`command: ${command} -- url: ${url}`)
}
