import path from 'path'
import * as assert from 'assert'
import FileHelpers from '../../libs/FileHelpers.js'

describe('FileHelpers', function() {
  describe('#getFileName()', function() {
    it(`should create a new filename with an added text or random unix timestamp for randomeness`, function(done) {
      const filename = FileHelpers.getFileName('myFile.txt')
      const testRegexp = /^myFile_\d+\.txt$/
      done(assert.equal(testRegexp.test(filename),true))
    })

    it(`should create a specified filename per the extra text`, function(done) {
      const filename2 = FileHelpers.getFileName('myFile.txt', '123')
      done(assert.equal(filename2, 'myFile_123.txt'))
    })
  })
})
