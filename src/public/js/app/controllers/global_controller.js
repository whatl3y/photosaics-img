export default class GlobalController {
  constructor($scope, $http) {
    this._scope = $scope
    this._http = $http

    this._scope.optionKey = this.optionKey.bind(this)
    this._scope.isArray = this.isArray.bind(this)
    this._scope.validateImageSettings = this.validateImageSettings.bind(this)
    this._scope.updateAryLength = this.updateAryLength.bind(this)
    this.init()
  }

  init() {
    this.baseUrl = `${location.protocol}//${location.host}`
    this._scope.processingFunctions = []
    this._scope.functionTypes = {
      b: {name: 'Add Border', options: [{length:'number'}]},
      c: {name: 'Crop Image', options: [{width:'number'}, {height:'number'}]},
      g: {name: 'Make Image Grayscale (desaturate)', options: []},
      m: {name: 'Mirror Image over an axis', options: [{axis: ['x', 'y', 'xy']}]},
      o: {name: 'Rotate Image (clockwise)', options: [{degrees: 'number'}]},
      r: {name: 'Resize Image', options: [{width:'number'}, {height:'number'}]},
      s: {name: 'Resize Image of specified width, having same width:height ratio', options: [{width: 'number'}]},
      q: {name: 'Make image square by cropping from the middle outward', options: []}
    }

    this.validateImageSettings()
    setInterval(() => this._scope.$apply(() => this.validateImageSettings()),1000)
    // this._scope.$watch(this._scope.imageUrl, (i) => this.validateImageSettings())
    // this._scope.$watch(this._scope.processingFunctions, (i) => this.validateImageSettings())
  }

  generateUrl(imageUrl, settings) {
    if (this.isLoadingGenerated) return true
    const encodedFunctions = settings.map((s) => s.type).join('') || '*'
    let encodedSettings = {}

    settings.forEach((s) => {
      encodedSettings[s.type] = {}
      const typeConfig = this._scope.functionTypes[s.type]
      if (typeConfig) {
        typeConfig.options.forEach((o) => {
          const key = Object.keys(o)[0]
          encodedSettings[s.type][key] = s[key].val
        })
      }
    })
    encodedSettings = (Object.keys(encodedSettings).length) ? encodeURIComponent(JSON.stringify(encodedSettings)) : '*'
    const generatedUrl = `${this.baseUrl}/${encodedFunctions}/${encodedSettings}/${imageUrl}`
    if (generatedUrl === this._scope.generatedUrl) return true

    delete(this._scope.final)
    this.isLoadingGenerated = true
    this._http.get(generatedUrl)
    .success((res) => {
      this._scope.generatedUrl = generatedUrl
      this._scope.final = {
        valid: true,
        url: generatedUrl
      }
      delete(this.isLoadingGenerated)
    })
    .error((data) => {
      this._scope.generatedUrl = generatedUrl
      this._scope.final = {
        valid: false,
        error: data.toString()
      }
      delete(this.isLoadingGenerated)
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
          if (!setting[key] || (!setting[key].val && setting[key].val !== 0)) {
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
