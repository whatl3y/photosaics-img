import async_waterfall from 'async/waterfall'
import * as lwip from 'lwip'
import ImageHelpers from './ImageHelpers'

export default class ImageProcessor extends ImageHelpers {
  constructor(imageInfo) {
    super(imageInfo)
  }

  execute(commands, params, callback) {
    const self = this
    let commandsAry = commands.split('')
    let waterfallFunctions = []

    if (commandsAry.length) {
      commandsAry.forEach((command) => {
        waterfallFunctions.push(function(imageBuffer,_callback) {
          // Handle the first process which would only pass
          // a callback (see async_waterfall)
          if (typeof imageBuffer === 'function') {
            _callback = imageBuffer
            imageBuffer = self._image
          }
          return self.executeSingleCommandFromParams(imageBuffer, command, params, _callback)
        })
      })
    } else {
      waterfallFunctions.push(function(imageBuffer,_callback) {
        // Handle the first process which would only pass
        // a callback (see async_waterfall)
        if (typeof imageBuffer === 'function') {
          _callback = imageBuffer
          imageBuffer = self._image
        }
        return self.toBuffer(imageBuffer, _callback)
      })
    }

    return async_waterfall(waterfallFunctions,callback)
  }

  executeSingleCommandFromParams(imageBuffer, commandKey, allParams, callback) {
    const commandParams = allParams[commandKey]
    const commandFunction = this.commandKeyFunctionMap()[commandKey]

    switch(commandKey) {
      case 'r':
        if (!commandParams) return this.noopProcessFunction(imageBuffer, callback)
        const width = parseInt(commandParams.width || commandParams.w)
        const height = parseInt(commandParams.height || commandParams.h || width)
        return commandFunction(imageBuffer, width, height, callback)
        break
      case 's':
        if (!commandParams) return this.noopProcessFunction(imageBuffer, callback)
        const length = parseInt(commandParams.length || commandParams.l || commandParams.width || commandParams.w)
        return commandFunction(imageBuffer, length, callback)
        break
    }
    return callback(new Error(`We don't recognize the command key provided.`))
  }

  // All functions here will/should return the processed images back
  // as buffers
  commandKeyFunctionMap() {
    const self = this
    return {
      r: this.resizeToBuffer.bind(this),
      s: this.resizeSameRatioToBuffer.bind(this)
    }
  }

  resizeSameRatioToBuffer(...args) {
    const self = this
    let image = this._image
    let newWidth
    let callback
    switch (args.length) {
      case 3:
        image = args[0]
        newWidth = args[1]
        callback = args[2]
        break
      case 2:
        newWidth = args[0]
        callback = args[1]
        break
      default:
        return new Error('No callback provided.')
    }

    async_waterfall([
      function(_callback) {
        self.resizeSameRatio(image, newWidth, _callback)
      },
      function(newLwipImage, _callback) {
        self.toBuffer(newLwipImage, _callback)
      }
    ],
      function(err, newImageBuffer) {
        return callback(err,newImageBuffer)
      }
    )
  }

  resizeToBuffer(...args) {
    // width, height, callback
    const self = this
    let image = this._image
    let width
    let height
    let callback
    switch (args.length) {
      case 4:
        image = args[0]
        width = args[1]
        height = args[2]
        callback = args[3]
        break
      case 3:
        width = args[0]
        height = args[1]
        callback = args[2]
        break
      case 2:
        width = args[0]
        height = width
        callback = args[1]
        break
      default:
        return new Error('No callback provided.')
    }

    async_waterfall([
      function(_callback) {
        self.open(image, _callback)
      },
      function(openedImage,_callback) {
        openedImage.resize(width, height, _callback)
      },
      function(newLwipImage, _callback) {
        self.toBuffer(newLwipImage, _callback)
      }
    ],
      function(err, newImageBuffer) {
        return callback(err,newImageBuffer)
      }
    )
  }

  noopProcessFunction(imageBuffer, callback) {
    const self = this
    imageBuffer = imageBuffer || this._image
    async_waterfall([
      function(_callback) {
        self.open(imageBuffer, _callback)
      },
      function(newLwipImage, _callback) {
        self.toBuffer(newLwipImage, _callback)
      }
    ],callback)
  }

  allCommandKeysAsString() {
    return Object.keys(this.commandKeyFunctionMap()).join('')
  }

  static commandKeys() {
    const ip = new ImageProcessor()
    return ip.allCommandKeysAsString()
  }
}

module.exports = ImageProcessor
