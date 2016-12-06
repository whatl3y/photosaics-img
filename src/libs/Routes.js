import * as fs from 'fs'
import async_waterfall from 'async/waterfall'
import async_each from 'async/each'

export default class Routes {
  constructor(options) {
    options = options || {}
    this._path = options._path || 'routes'
  }

  get(callback) {
    const self = this

    async_waterfall([
      function(_callback) {
        fs.readdir(self._path,function(err,files) {
          return _callback(err,files)
        })
      },
      function(files,_callback) {
        let allRoutes = []
        async_each(files,function(file,__callback) {
          const routeInfo = file.replace(/\.js/g,"").replace(/_/g,"/").replace(/\[star\]/g,"*").replace(/\[colon\]/g,":").split("..")
          const routeOrder = Number(routeInfo[0] || 0)
          const routePath = routeInfo[1]
          const routeVerb = routeInfo[2] || 'get'

          allRoutes.push({
            verb: routeVerb,
            path: routePath,
            order: routeOrder,
            file: file
          })

          return __callback()
        },
        function(err) {
          return _callback(err,allRoutes)
        })
      }
    ],
      function(err,routes) {
        if (err) return callback(err)

        routes = routes.sort(function(r1,r2) { return r1.order-r2.order })
        return callback(err,routes)
      }
    )
  }

  static requireLoginExpressMiddleware(returnJsonFailure=false,failureCallback=function(){}) {
    return function(req,res,next) {
      if (typeof req.session.user === 'object' && req.session.user.username) return next()

      failureCallback()

      if (returnJsonFailure) return res.status(401).json({error:'Please login to access this resource.'})
      return res.redirect('/')
    }
  }
}

module.exports = Routes
