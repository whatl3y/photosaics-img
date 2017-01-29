export default class FileHelpers {
  constructor(options) {
    options = options || {}
    this._db = options.db
  }

  fileName(filename, extraText=Date.now()) {
    return FileHelpers.getFileName(filename, extraText)
  }

  static getFileName(fileName, extraText=Date.now()) {
    const lastPeriod = fileName.lastIndexOf(".")
    return `${fileName.substring(0,lastPeriod)}_${extraText}${fileName.substring(lastPeriod)}`
  }
}

module.exports = FileHelpers
