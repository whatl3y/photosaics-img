var newrelic = require('newrelic')
var os = require('os')
var url = require('url')
var fs = require('fs')
var express = require('express')
var app = express()
var cluster = require('cluster')
var formidable = require('express-formidable')
var bodyParser = require('body-parser')
var path = require('path')
var async = require('async')
var jade = require('pug')
var Routes = require("./libs/Routes.js")
var config = require("./config.js")
var log = require('bunyan').createLogger(config.logger.options)

var isHttpsFromHostname = config.server.HOST.indexOf('https://') > -1
var isHttpsFromConfig = process.env.SECURE
var serverTypeMap = {}
if (isHttpsFromConfig) {
  var privateKey = fs.readFileSync( 'certs/server.key' )
  var certificate = fs.readFileSync( 'certs/server.crt' )
  var creds = {key:privateKey, cert:certificate}
  var https = require('https').Server(creds, app)
  serverTypeMap['server'] = https
} else {
  var http = require('http').Server(app)
  serverTypeMap['server'] = http
}

try {
  //handle clustering if applicable
  if (config.server.CLUSTERING) {
    if (!sticky.listen(serverTypeMap['server'],config.server.PORT)) {    //if (cluster.isMaster) {}
      serverTypeMap['server'].once('listening',() => log.info("listening on *:"+config.server.PORT))

      // Count CPUs, max CLUSTER_MAX_CPUS forks
      var cpuCount = os.cpus().length
      log.debug("Number of CPUs on machine: " + cpuCount)
      cpuCount = (cpuCount > config.server.CLUSTER_MAX_CPUS) ? config.server.CLUSTER_MAX_CPUS : cpuCount
      log.debug("Number of CPUs we're using: " + cpuCount)

      // Create a worker for each CPU
      for (var _i=0; _i<cpuCount; _i++) {
        cluster.fork()
      }

      // Listen for dying workers
      cluster.on('exit', function (worker) {
        // Replace the dead worker
        log.info('Worker ' + worker.id + " died. Creating another worker...")
        cluster.fork()
      })
    } else {
      main()
    }
  } else {
    main(true)
  }

} catch (_err) {
  log.error(_err)
}


//FUNCTIONS
function main(notClustering) {
  async.waterfall([
    function(callback) {
      new Routes().get(function(err, routes) {
        log.debug("Finished setting up routes.")
        callback(err, routes)
      })
    }
  ],
    function(err,routes) {
      if (err) {
        log.error(err)
        return process.exit()
      }

      //template engine setup
      app.set('views', path.join(__dirname, 'views'))
      app.set('view engine', 'pug')

      app.use(bodyParser.urlencoded({extended:true, limit:'10mb'}))
      app.use(bodyParser.json({limit:'1mb'}))
      app.use(formidable.parse())

      //static files
      app.use('/public',express.static(path.join(__dirname,'/public')))

      // HEROKU DEPLOYMENT ONLY HTTPS REDIRECT
      // In production redirect to https endpoint
      // http://stackoverflow.com/questions/29810607/how-to-force-https-redirect-on-heroku-with-express-4-0
      // app.use(function(req, res, next) {
      //   if (config.server.IS_PRODUCTION) {
      //     if (req.headers['x-forwarded-proto'] != 'https') {
      //       return res.redirect('https://' + req.headers.host + req.url)
      //     }
      //   }
      //   return next()
      // })

      // initialize routes object to be used to bind express routes
      var aRoutes = fs.readdirSync('routes')
      var oRoutes = {}
      for (var _i=0; _i < aRoutes.length; _i++) {
        oRoutes[aRoutes[_i]] = require("./routes/" + aRoutes[_i])
      }

      //setup route handlers in the express app
      routes.forEach(function(route) {
        try {
          app[route.verb.toLowerCase()](route.path,oRoutes[route.file])
        } catch(err) {
          log.error(err,"Error binding route to express; method: " + route.verb + "; path: " + route.path)
        }
      })

      //starts the web server listening on specified port
      //if we're not clustered
      if (notClustering) {
        serverTypeMap['server'].listen(config.server.PORT,() => log.info("listening on *:"+config.server.PORT))
      }

      //handle if the process suddenly stops
      //process.on('exit',config.mongodb.MDB.close)
      //process.on('SIGINT',config.mongodb.MDB.close)
      //process.on('SIGTERM',config.mongodb.MDB.close)
    }
  )
}
