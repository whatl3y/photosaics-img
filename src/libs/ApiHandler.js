import * as request from 'request'

export default class ApiHandler {
  constructor(...args) {
    if (typeof args[0] === 'object') {
      const a = args[0]
      this.access_token = a.access_token
    } else {
      switch (args.length) {
        case 1:
          this.access_token = args[0]
          break
      }
    }

    this._default_body = {access_token: this.access_token}
    this._request = request
    this._paging = {}
  }

  params(obj={}) {
    return (typeof obj === "string") ? obj : ApiHandler.serialize(obj)
  }

  requestBody(object={}) {
    return this.params(ApiHandler.mergeObject(this._default_body,object))
  }

  responseFunction(callback) {
    return function(err,httpResponse,body) {
      if (err) return callback(err)
      if (httpResponse.statusCode !== 200) return callback(body)

      const oBody = JSON.parse(body)
      return callback(null,oBody)
    }
  }

  static serialize(obj) {
    let a = []
    for (const _key in obj) {
      if (obj[_key] instanceof Array) {
        for (let _i = 0; _i < obj[_key].length; _i++) {
          a.push(encodeURIComponent(_key) + '=' + encodeURIComponent(obj[_key][_i]))
        }
      } else {
        a.push(encodeURIComponent(_key) + '=' + encodeURIComponent(obj[_key]))
      }
    }
    return a.join("&")
  }

  static unserialize(string) {
    string = (/^\?/.test(string)) ? string.substring(1) : string
    const a = string.split("&")
    let obj = {}
    for (let _i = 0; _i < a.length; _i++) {
      var _a = a[_i].split("=")
      obj[ decodeURIComponent(_a[0]) ] = decodeURIComponent(_a[1])
    }
    return obj
  }

  static mergeObject(obj1,obj2,obj3) {
    obj3 = obj3 || {}
    const isObject = function(obj,attr) {
      const toClass = {}.toString
      return typeof obj[attr] === "object" && toClass.call(obj[attr]) == "[object Object]"
    }

    if (typeof obj1 !== 'object') {
      //do nothing
    } else if (typeof obj2 !== 'object') {
      for (const attrname in obj1) {
        if (isObject(obj1,attrname)) obj3[attrname] = ApiHandler.mergeObject(obj1[attrname],null,obj3[attrname])
        else obj3[attrname] = obj1[attrname]
      }
    } else {
      for (const attrname in obj1) {
        if (isObject(obj1,attrname)) obj3[attrname] = ApiHandler.mergeObject(obj1[attrname],null,obj3[attrname])
        else obj3[attrname] = obj1[attrname]
      }
      for (const attrname in obj2) {
        if (isObject(obj2,attrname)) obj3[attrname] = ApiHandler.mergeObject(obj2[attrname],null,obj3[attrname])
        else obj3[attrname] = obj2[attrname]
      }
    }
    return obj3
  }
}

module.exports = ApiHandler
