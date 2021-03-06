export default class GlobalController {
  constructor($scope, $http, uiUploader) {
    this._scope = $scope
    this._http = $http
    this._uploader = uiUploader

    this._scope.optionKey = this.optionKey.bind(this)
    this._scope.isArray = this.isArray.bind(this)
    this._scope.validateImageSettings = this.validateImageSettings.bind(this)
    this._scope.updateAryLength = this.updateAryLength.bind(this)
    this.init()
  }

  init() {
    this._scope.baseUrl = `${location.protocol}//${location.host}`
    this._scope.processingFunctions = []
    this._scope.functionTypes = {
      b: {
        name: 'Add Border',
        options: [
          {length: {type: 'number', required: true}},
          {color: {type: 'text', required: false}}
        ]
      },
      c: {
        name: 'Crop Image',
        options: [
          {left: {type: 'number', required: true}},
          {top: {type: 'number', required: false}},
          {right: {type: 'number', required: false}},
          {bottom: {type: 'number', required: false}}
        ]
      },
      g: {
        name: 'Grayscale Image (desaturate)',
        options: []
      },
      m: {
        name: 'Mirror Image over an axis',
        options: [{axis: {type: ['x', 'y', 'xy'], required: true}}]
      },
      o: {
        name: 'Rotate Image (clockwise)',
        options: [
          {degrees: {type: 'number', required: true}}
        ]
      },
      r: {
        name: 'Resize Image',
        options: [
          {width: {type: 'number', required: true}},
          {height: {type: 'number', required: true}}
        ]
      },
      s: {
        name: 'Resize Image of specified width, having same width:height ratio',
        options: [
          {width: {type: 'number', required: true}}
        ]
      },
      t: {
        name: 'Makes the specified color (hex value) to become transparent.',
        warning: 'This operation can take a little time to complete. After it is finished processing retrieval from AWS S3 will be fast.',
        options: [
          {color: {type: 'text', required: true}}
        ]
      },
      q: {
        name: 'Make image square by cropping from the middle outward',
        options: []
      }
    }

    this.validateImageSettings()
    setInterval(() => this._scope.$apply(() => this.validateImageSettings()),400)
    // this._scope.$watch(this._scope.imageUrl, (i) => this.validateImageSettings())
    // this._scope.$watch(this._scope.processingFunctions, (i) => this.validateImageSettings())

    this.bindEventHandlers()
  }

  bindEventHandlers() {
    this.imageElement = document.getElementById('upload-image-file')
    if (!this.imageElement) {
      return setTimeout(() => this.bindEventHandlers(), 250)
    }
    this.imageElement.addEventListener('change', this.addUploadFile.bind(this))
  }

  addUploadFile(ev) {
    const self = this

    this._scope.loadingSync = true
    const files = ev.target.files
    this._uploader.addFiles(files)
    this._uploader.startUpload({
      url: '/api/upload',
      data: {},
      concurrency: 2,
      onProgress: function(file) {
        // file contains a File object
        console.log("PROGRESS",file)
      },
      onError: function(err) {
        console.log("ERROR",err)
      },
      onCompleted: function(file, response, status, xhr) {
        // file contains a File object
        // console.log(file);
        // response contains the server response
        console.log("RESPONSE",file,response,status,xhr)
        var doSomething = function(xhr) {
          if (!xhr.response) {
            return setTimeout(() => doSomething(xhr),500)
          }
          delete(self._scope.loadingSync)
          self._scope.imageUrl = `${self._scope.baseUrl}/file/s3/${JSON.parse(xhr.response).filename}`
          self._scope.$apply()
        }
        doSomething(xhr)
      },
      onCompletedAll: function(files) {
        // files is an array of File objects
        console.log("COMPLETED",files)
      }
    })
    ev.target.value = ''
  }

  generateUrl(imageUrl, settings) {
    if (this._scope.isValidatingGeneratedUrl) return true
    const encodedFunctions = settings.map((s) => s.type).join('') || '*'
    let encodedSettings = {}

    settings.forEach(s => {
      encodedSettings[s.type] = {}
      const typeConfig = this._scope.functionTypes[s.type]
      if (typeConfig) {
        typeConfig.options.forEach((o) => {
          const key = Object.keys(o)[0]
          if (s[key] && (s[key].val || s[key].val === 0)) {
            encodedSettings[s.type][key] = s[key].val
          }
        })
      }
    })

    encodedSettings = (Object.keys(encodedSettings).length) ? encodeURIComponent(JSON.stringify(encodedSettings)) : '*'
    let generatedUrl = `${this._scope.baseUrl}/${encodedFunctions}/*/${imageUrl}`
    if (generatedUrl === this._scope.generatedUrl) return true

    this._http.get(`/api/serialize/${btoa(encodedSettings)}`)
    .success((res) => {
      this._scope.serializedSettings = (encodedSettings === '*') ? '*' : res.string
      generatedUrl = `${this._scope.baseUrl}/${encodedFunctions}/${this._scope.serializedSettings}/${imageUrl}`
      if (generatedUrl === this._scope.generatedUrl) return true

      this._scope.generatedUrl = generatedUrl
      delete(this._scope.final)
      this._scope.isValidatingGeneratedUrl = true
      this._http.get(generatedUrl)
      .success((res) => {
        this._scope.final = {
          valid: true,
          url: generatedUrl
        }
        delete(this._scope.isValidatingGeneratedUrl)
      })
      .error((data) => {
        this._scope.final = {
          valid: false,
          error: data.toString()
        }
        delete(this._scope.isValidatingGeneratedUrl)
      })
    })
    .error((data) => {
      console.log("Error",data)
      delete(this._scope.isValidatingGeneratedUrl)
    })
  }

  validateImageSettings() {
    if (!this.validateUrl(this._scope.imageUrl)) return this._scope.validateError = 'Please make sure you have a valid image URL (starting with http:// or https://)'
    if (!this.validateSettings(this._scope.processingFunctions)) return this._scope.validateError = 'Please ensure all processing functions selected have required values configured.'
    delete(this._scope.validateError)
    return this.generateUrl(this._scope.imageUrl, this._scope.processingFunctions)
  }

  validateUrl(url) {
    return url && (url.indexOf('http://') === 0 || url.indexOf('https://') === 0)
  }

  validateSettings(settings) {
    let isValid = true
    settings.forEach((setting) => {
      const typeConfig = this._scope.functionTypes[setting.type]
      if (typeConfig) {
        typeConfig.options.forEach((o) => {
          const key = Object.keys(o)[0]
          if (o[key].required && (!setting[key] || (!setting[key].val && setting[key].val !== 0))) {
            isValid = false
          }
        })
      } else {
        isValid = false
      }
    })
    return isValid
  }

  optionKey(optionsObj) {
    return Object.keys(optionsObj)[0]
  }

  isArray(obj) {
    return (obj instanceof Array)
  }

  updateAryLength(scopeKey,which) {
    scopeKey = scopeKey || "";
    which = which || "inc";

    switch(which) {
      case "inc":
        this._scope[scopeKey] = this._scope[scopeKey].concat({});
        break;

      case "dec":
        this._scope[scopeKey].pop();
        break;
    }
  }
}
