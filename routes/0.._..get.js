var async = require('async')
var config = require("../config.js")
var log = require('bunyan').createLogger(config.logger.options)

module.exports = function(req,res) {
  res.render('index')
}
