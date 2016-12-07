import async_waterfall from 'async/waterfall'
import * as lwip from 'lwip'
import * as Jimp from 'jimp'
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

    let axis
    let color
    let degrees
    let height
    let width
    let length

    switch(commandKey) {
      case 'b':
        if (!commandParams) return this.noopProcessFunction(imageBuffer, callback)
        length = parseInt(commandParams.length || commandParams.l || commandParams.width || commandParams.w)
        color = commandParams.color || commandParams.c || 'black'
        return commandFunction(imageBuffer, length, color, callback)
        break
      case 'c':
        if (!commandParams) return this.noopProcessFunction(imageBuffer, callback)
        width = parseInt(commandParams.width || commandParams.w || commandParams.length || commandParams.l)
        height = parseInt(commandParams.height || commandParams.h || width)
        return commandFunction(imageBuffer, width, height, callback)
        break
      case 'g':
        return commandFunction(imageBuffer, callback)
        break
      case 'm':
        axis = (!commandParams) ? 'x' : (commandParams.axis || commandParams.a)
        return commandFunction(imageBuffer, axis, callback)
        break
      case 'o':
        if (!commandParams) return this.noopProcessFunction(imageBuffer, callback)
        degrees = parseInt(commandParams.degrees || commandParams.d)
        return commandFunction(imageBuffer, degrees, callback)
        break
      case 'r':
        if (!commandParams) return this.noopProcessFunction(imageBuffer, callback)
        width = parseInt(commandParams.width || commandParams.w || commandParams.length || commandParams.l)
        height = parseInt(commandParams.height || commandParams.h || width)
        return commandFunction(imageBuffer, width, height, callback)
        break
      case 's':
        if (!commandParams) return this.noopProcessFunction(imageBuffer, callback)
        length = parseInt(commandParams.length || commandParams.l || commandParams.width || commandParams.w)
        return commandFunction(imageBuffer, length, callback)
        break
      case 'q':
        return commandFunction(imageBuffer, callback)
        break
    }
    return callback(new Error(`We don't recognize the command key provided.`))
  }

  // All functions here will/should return the processed images back
  // as buffers
  commandKeyFunctionMap() {
    const self = this
    return {
      b: this.addBorderToBuffer.bind(this),
      c: this.cropImageToBuffer.bind(this),
      g: this.grayscaleToBuffer.bind(this),
      m: this.mirrorToBuffer.bind(this),
      o: this.rotateToBuffer.bind(this),
      r: this.resizeToBuffer.bind(this),
      s: this.resizeSameRatioToBuffer.bind(this),
      q: this.squareToBuffer.bind(this)
    }
  }

  addBorderToBuffer(...args) {
    const self = this
    let image = this._image
    let length
    let color = 'black'
    let callback
    switch (args.length) {
      case 4:
        image = args[0]
        length = args[1]
        color = args[2]
        callback = args[3]
        break
      case 3:
        length = args[0]
        color = args[1]
        callback = args[2]
        break
      case 2:
        length = args[0]
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
        openedImage.pad(length, length, length, length, color, _callback)
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

  cropImageToBuffer(...args) {
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
        openedImage.crop(width, height, _callback)
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

  grayscaleToBuffer(image, callback) {
    async_waterfall([
      function(_callback) {
        Jimp.read(image,_callback)
      },
      function(jimpImage,_callback) {
        jimpImage.greyscale(_callback)
      },
      function(newJimpImage, _callback) {
        newJimpImage.getBuffer(Jimp.MIME_PNG, _callback)
      }
    ],
      function(err, newImageBuffer) {
        return callback(err,newImageBuffer)
      }
    )
  }

  mirrorToBuffer(image, axis, callback) {
    const self = this
    async_waterfall([
      function(_callback) {
        self.open(image, _callback)
      },
      function(lwipImage, _callback) {
        lwipImage.mirror(axis, _callback)
      },
      function(newLwipImage, _callback) {
        self.toBuffer(newLwipImage, _callback)
      }
    ],callback)
  }

  rotateToBuffer(...args) {
    const self = this
    let image = this._image
    let degrees
    let callback
    switch (args.length) {
      case 3:
        image = args[0]
        degrees = args[1]
        callback = args[2]
        break
      case 2:
        degrees = args[0]
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
        openedImage.rotate(degrees, {r:0,g:0,b:0,a:0}, _callback)
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

  squareToBuffer(image, callback) {
    const self = this
    image = image || this._image
    async_waterfall([
      function(_callback) {
        self.square(image, 'center', _callback)
      },
      function(newLwipImage, _callback) {
        self.toBuffer(newLwipImage, _callback)
      }
    ],callback)
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
