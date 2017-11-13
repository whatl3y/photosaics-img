import async_parallel from 'async/parallel'
import async_reduce from 'async/reduce'
import async_waterfall from 'async/waterfall'
import async_times from 'async/times'
import fs from 'fs'
// import * as imagetype from 'image-type'
const imageType = require('image-type')
import request from 'request'
import lwip from 'pajk-lwip'
import exif from 'exif'
import AwsS3 from './AwsS3'

export default class ImageHelpers {
  constructor(imageInfo) {
    this._image = imageInfo
    this._request = request.defaults({encoding: null})
  }

  open(...args) {
    const self = this
    let image = this._image
    let imgType = null
    let callback = function(){}
    switch (args.length) {
      case 3:
        image = args[0]
        imgType = args[1]
        callback = args[2]
        break
      case 2:
        image = args[0]
        callback = args[1]
        break
      case 1:
        callback = args[0]
        break
      default:
        return new Error('No callback provided.')
    }

    if (typeof image === 'object' && image != null && image.toString() === '[object Object]') return callback(null,image)
    if (image instanceof Buffer) {
      const ty = imageType(image)
      if (typeof ty === 'object' && ty !== null) {
        return lwip.open(image, ty.ext, callback)
      }
      return callback(new Error(`Invalid image type.`))
    }
    if (imgType) return lwip.open(image, imgType, callback)
    if (typeof image === 'string' && (image.indexOf('http://') === 0 || image.indexOf('https://') === 0)) {
      async_waterfall([
        function(_callback) {
          self.imageToBuffer('url', image, _callback)
        },
        function(buffer, type, _callback) {
          self.toBuffer(buffer, 'png', _callback)
        },
        function(newPngBuffer, _callback) {
          self.open(newPngBuffer, 'png', _callback)
        }
      ],callback)
      return
    }
    lwip.open(image, callback)
  }

  imageToBuffer(...args) {
    const self = this
    let type
    let image
    let callback
    switch (args.length) {
      case 3:
        type = args[0]
        image = args[1]
        callback = args[2]
        break
      case 2:
        type = args[0]
        image = this._image
        callback = args[1]
        break
      case 1:
        type = 'fs'
        image = this._image
        callback = args[0]
        break
      default:
        return new Error('No callback provided.')
    }

    // image is already a Buffer
    if (image instanceof Buffer) return callback(null,image,imageType(image).ext)

    switch(type) {
      case 'fs':
        fs.readFile(image,function(err,buffer) {
          return callback(err,buffer,ImageHelpers.getImageTypeFromFile(image))
        })
        break
      case 's3':
        const s3 = new AwsS3()
        s3.getFile({filename: image},function(e,data) {
          if (e) return callback(e)
          return callback(null,data.Body,ImageHelpers.getImageTypeFromFile(data.Body))
        })
        break
      case 'url':
        this._request.get(image,function(err,httpResponse,body) {
          if (err) return callback(err)
          if (httpResponse.statusCode !== 200) return callback(body)

          let imgType = httpResponse.headers['content-type']
          imgType = (imgType) ? ImageHelpers.getImageTypeFromFile(`.${imgType.substring(imgType.lastIndexOf('/')+1)}`) : imageType(body).ext
          return callback(null,body,imgType)
        })
        break
      default:
        return this.imageToBuffer('url',image,callback)
    }
  }

  imageToLwip(...args) {
    const self = this
    let type
    let image
    let callback
    switch (args.length) {
      case 3:
        type = args[0]
        image = args[1]
        callback = args[2]
        break
      case 2:
        type = args[0]
        image = this._image
        callback = args[1]
        break
      case 1:
        type = 'fs'
        image = this._image
        callback = args[0]
        break
      default:
        return new Error('No callback provided.')
    }

    async_waterfall([
      function(_callback) {
        self.imageToBuffer(type,image,_callback)
      },
      function(imageBuffer,imageFileType,_callback) {
        self.open(imageBuffer,imageFileType,_callback)
      }
    ],
      function(err,image) {
        return callback(err,image)
      }
    )
  }

  toBuffer(...args) {
    const self = this
    let image = this._image
    let format = 'png'
    let options = null
    let callback
    switch (args.length) {
      case 4:
        image = args[0]
        format = args[1]
        options = args[2]
        callback = args[3]
        break
      case 3:
        image = args[0]
        format = args[1]
        callback = args[2]
        break
      case 2:
        image = args[0]
        callback = args[1]
        break
      case 1:
        callback = args[0]
        break
      default:
        return new Error('No callback provided.')
    }

    async_waterfall([
      function(_callback) {
        self.open(image,_callback)
      },
      function(lwipImage,_callback) {
        if (options) return lwipImage.toBuffer(format,options,_callback)
        return lwipImage.toBuffer(format,_callback)
      }
    ],
      function(err,newBuffer) {
        callback(err,newBuffer)
      }
    )
  }

  dimensions(...args) {
    const self = this
    let image = this._image
    let callback = null
    switch (args.length) {
      case 2:
        image = args[0]
        callback = args[1]
        break
      case 1:
        callback = args[0]
        break
      default:
        return new Error('No callback provided.')
    }

    async_waterfall([
      function (_callback) {
        return self.open(image,_callback)
      },
      function (image, _callback) {
        return _callback(null, image.width(), image.height())
      }
    ],
      function (e, width, height) {
        return callback(e, [width, height])
      }
    )
  }

  // averageImageColor
  // DESCRIPTION: returns a color object ({r:#,g:#,b:#}) that
  // represents that average color of the image
  averageImageColor(...args) {
    const self = this
    let image = this._image
    let gridNumber = 10
    let callback = null
    switch (args.length) {
      case 3:
        image = args[0]
        gridNumber = args[1]
        callback = args[2]
        break
      case 2:
        gridNumber = args[0]
        callback = args[1]
        break
      case 1:
        callback = args[0]
        break
      default:
        return new Error('No callback provided.')
    }

    const gridArray = new Array(gridNumber).fill(0).map(function(item,_i) { return _i+0.99 })

    async_waterfall([
      function(_callback) {
        self.open(image,_callback)
      },
      function(image,_callback) {
        // try {
          const dim = {w:image.width(),h:image.height()}
          let parallelFunctions = []
          gridArray.forEach(function(_x) {
            gridArray.forEach(function(_y) {
              parallelFunctions.push(function(__callback) {
                // try {
                  const pixelColor = image.getPixel(Math.floor(dim.w*(_x/gridNumber)), Math.floor(dim.h*(_y/gridNumber)))
                  return __callback(null, pixelColor)
                // } catch(_e) {
                //   return __callback(_e)
                // }
              })
            })
          })

          async_parallel(parallelFunctions, function(err,colors) {
            if (err) return _callback(err)
            return ImageHelpers.colorAverage(colors,_callback)
          })
        // } catch(err) {
        //   return _callback(err)
        // }
      }
    ],
      function(err,averageColorObject) {
        return callback(err,averageColorObject)
      }
    )
  }

  rotate(...args) {
    const self = this
    let image = this._image
    let degrees
    let callback
    switch (args.length) {
      case 3:
        degrees = args[0]
        image = args[1]
        callback = args[2]
        break
      case 2:
        degrees = args[0]
        callback = args[1]
        break
      default:
        return new Error('No degrees or callback provided.')
    }

    async_waterfall([
      function(_callback) {
        self.open(image,_callback)
      },
      function(lwipImage,_callback) {
        lwipImage.rotate(degrees,_callback)
      }
    ],
      function(err,rotatedImage) {
        return callback(err,rotatedImage)
      }
    )
  }

  square(...args) {
    const self = this
    let image = this._image
    let area = 'center'
    let callback = ImageHelpers.noop
    switch (args.length) {
      case 3:
        image = args[0]
        area = args[1]
        callback = args[2]
        break
      case 2:
        area = args[0]
        callback = args[1]
        break
      case 1:
        callback = args[0]
        break
      default:
        return new Error('No callback provided.')
    }

    async_waterfall([
      function (_callback) {
        self.open(image,_callback)
      },
      function (image, _callback) {
        const h = image.height()
        const w = image.width()
        const length = ImageHelpers.squareLength(image)
        switch (area) {
          case 'center':
            return image.crop(length, length, _callback)
          case 'topleft':
            return image.crop(0, 0, length, length, _callback)
          case 'topright':
            return image.crop(w - length, 0, w, length, _callback)
          case 'bottomleft':
            return image.crop(0, h - length, length, h, _callback)
          case 'bottomright':
            return image.crop(w - length, h - length, w, h, _callback)
          default:
            return self.square(image, 'center', _callback)
        }
      }
    ],
      function (e, newImage) {
        return callback(e, newImage)
      }
    )
  }

  resizeSameRatio(...args) {
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
        self.open(image,_callback)
      },
      function(openedImage,_callback) {
        self.widthHeightRatio(openedImage,function(e,widthHeight) {
          return _callback(e,openedImage,widthHeight)
        })
      },
      function(openedImage,widthHeight,_callback) {
        const newHeight = Math.floor((1/widthHeight) * newWidth)
        openedImage.resize(newWidth,newHeight,_callback)
      }
    ],
      function(err,newImage) {
        return callback(err,newImage)
      }
    )
  }

  widthHeightRatio(...args) {
    let image = this._image
    let callback = null
    switch (args.length) {
      case 2:
        image = args[0]
        callback = args[1]
        break
      case 1:
        callback = args[0]
        break
      default:
        return callback(new Error('No callback provided.'))
    }
    this.open(image,function(err,image) {
      if (err) return callback(err)
      const h = image.height()
      const w = image.width()
      return callback(null, w/h)
    })
  }

  rotateImagePerExifOrientation(...args) {
    const self = this
    let type = 'fs'
    let image = this._image
    let callback
    switch (args.length) {
      case 3:
        type = args[0]
        image = args[1]
        callback = args[2]
        break
      case 2:
        type = args[0]
        callback = args[1]
        break
      case 1:
        callback = args[0]
        break
      default:
        return new Error('No callback provided.')
    }
    const orientMirrorMap = {
      1: [0, false],
      2: [0, true],
      3: [180, false],
      4: [180, true],
      5: [90, true],
      6: [90, false],
      7: [270, true],
      8: [270, false]
    }

    let orientation
    async_waterfall([
      function(_callback) {
        self.getExifMetadata(args.slice(0,args.length-1).concat([function(err,exifData,imageBuffer) {
          if (err && err.code != 'NO_EXIF_SEGMENT' && err.code != 'NOT_A_JPEG') return _callback(err)
          return _callback(null,exifData,imageBuffer)
        }]))
      },
      function(exifData,imageBuffer,_callback) {
        orientation = (exifData) ? exifData.image.Orientation : null
        return self.open(imageBuffer,_callback)
      },
      function(lwipImage,_callback) {
        if (orientation) {
          return self.rotate(orientMirrorMap[orientation][0],lwipImage,_callback)
        }
        return _callback(null,lwipImage)
      },
      function(rotatedLwipImage,_callback) {
        if (orientation) {
          const shouldMirror = orientMirrorMap[orientation][1]
          if (shouldMirror) {
            return rotatedLwipImage.mirror('y',_callback)
          }
        }
        return _callback(null,rotatedLwipImage)
      }
    ],
      function(err,finalLwipImage) {
        return callback(err,finalLwipImage)
      }
    )
  }

  getExifMetadata(...args) {
    args = (args[0] instanceof Array) ? args[0] : args
    const self = this
    const ExifImage = exif.ExifImage
    let type = 'fs'
    let image = this._image
    let callback
    switch (args.length) {
      case 3:
        type = args[0]
        image = args[1]
        callback = args[2]
        break
      case 2:
        type = args[0]
        callback = args[1]
        break
      case 1:
        callback = args[0]
        break
      default:
        return new Error('No callback provided.')
    }

    async_waterfall([
      function(_callback) {
        self.imageToBuffer(type,image,_callback)
      },
      function(buffer,type,_callback) {
        new ExifImage({image: buffer},function(err,exifData) {
          return _callback(err, exifData, buffer)
        })
      }
    ],
      function(err, data, buffer) {
        return callback(err, data, buffer)
      }
    )
  }

  convertImageToTransparent(...args) {
    const self = this
    let image = this._image
    let color = '#fff'
    let callback
    switch (args.length) {
      case 3:
        image = args[0]
        color = args[1]
        callback = args[2]
        break
      case 2:
        color = args[0]
        callback = args[1]
        break
      case 1:
        callback = args[0]
        break
      default:
        return new Error('No callback provided.')
    }

    let batch
    async_waterfall([
      function(_callback) {
        self.open(image, _callback)
      },
      function(openedImage, _callback) {
        batch = image.batch()
        self.dimensions(openedImage, _callback)
      },
      function(widthHeight, _callback) {
        const third = 33.333
        const oColor = ImageHelpers.hexToRgb(color)
        const width = widthHeight[0]
        const height = widthHeight[1]
        new Array(width).fill(0).map((z,_i) => _i).forEach((_wi) => {
          new Array(height).fill(0).map((_z,__i) => __i).forEach((_hi) => {
            const pixelColor = image.getPixel(_wi, _hi)
            let newPixelColor = {r: pixelColor.r, g: pixelColor.g, b: pixelColor.b, a:pixelColor.a}
            if (Math.abs(pixelColor.r - oColor.r) <= 12) newPixelColor.a -= third
            if (Math.abs(pixelColor.g - oColor.g) <= 12) newPixelColor.a -= third
            if (Math.abs(pixelColor.b - oColor.b) <= 12) newPixelColor.a -= third
            if (newPixelColor.a !== pixelColor.a) {
              newPixelColor.a = (newPixelColor.a <= 0) ? 0 : Math.round(newPixelColor.a)
              batch.setPixel(_wi, _hi, newPixelColor)
            }
          })
        })
        _callback()
      }
    ],
      function(err) {
        if (err) return callback(err)
        batch.exec(callback)
      }
    )
  }

  static getImageTypeFromFile(fileName) {
    if (typeof fileName === 'string') {
      const paramIndex = fileName.indexOf('?')
      if (paramIndex > -1) {
        fileName = fileName.substring(0,paramIndex)
      }
      const extension = fileName.substring(fileName.lastIndexOf('.')+1)
      return ((extension === 'jpeg') ? 'jpg' : (extension || 'jpg')).toLowerCase()
    }
    return 'jpg'
  }

  static colorAverage(colorArray, callback) {
    async_reduce(colorArray, {r:0,g:0,b:0,a:0}, function(memo, color, _callback) {
      if (typeof color === 'string') color = ImageHelpers.hexToRgb(color)
      memo.r += color.r
      memo.g += color.g
      memo.b += color.b
      memo.a += (typeof color.a !== 'undefined') ? ((color.a === 0) ? 0 : (color.a || 100)) : 100
      return _callback(null,memo)
    },
      function(e, rgbSum) {
        if (e) return callback(e)
        rgbSum.r = Math.round(rgbSum.r/colorArray.length)
        rgbSum.g = Math.round(rgbSum.g/colorArray.length)
        rgbSum.b = Math.round(rgbSum.b/colorArray.length)
        rgbSum.a = Math.round(rgbSum.a/colorArray.length)
        return callback(null,rgbSum)
      }
    )
  }

  static squareLength(image, larger=false) {
    const width = image.width()
    const height = image.height()
    return (width < height)
      ? ((larger) ? height : width)
      : ((larger) ? width : height)
  }

  static hexToRgb(hexColor='#000000') {
    if (typeof hexColor !== 'string') return hexColor
    hexColor = ImageHelpers.hexToSix(hexColor)
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hexColor)
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null
  }

  static rgbToHex(r=0, g=0, b=0) {
    if (typeof r === 'object') {
      g = r.g
      b = r.b
      r = r.r
    }
    return "#" + ImageHelpers.componentToHex(r) + ImageHelpers.componentToHex(g) + ImageHelpers.componentToHex(b)
  }

  static componentToHex(c) {
    const hex = c.toString(16)
    return hex.length == 1 ? "0" + hex : hex
  }

  static hexToSix(hex='#000') {
    hex = hex.replace('#','')
    if (hex.length === 3) {
      return '#' + hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2]
    }
    return hex
  }

  static isValidHexColor(color) {
    if (typeof color === 'string') {
      return /(^#?[0-9A-F]{6}$)|(^#?[0-9A-F]{3}$)/i.test(color)
    }
    return false
  }

  static noop() {}
}

module.exports = ImageHelpers
