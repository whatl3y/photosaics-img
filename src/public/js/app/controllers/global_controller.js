export default class GlobalController {
  constructor($scope) {
    this._scope = $scope

    this._scope.optionKey = this.optionKey.bind(this)
    this._scope.isArray = this.isArray.bind(this)
    this._scope.updateAryLength = this.updateAryLength.bind(this)
    this.init()
  }

  init() {
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
