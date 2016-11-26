/*
    Toothrot Engine (v1.5.0)
    Build time: Sat, 26 Nov 2016 14:12:36 GMT
*/
(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (global){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
 * @license  MIT
 */
/* eslint-disable no-proto */

var base64 = require('base64-js')
var ieee754 = require('ieee754')
var isArray = require('isarray')

exports.Buffer = Buffer
exports.SlowBuffer = SlowBuffer
exports.INSPECT_MAX_BYTES = 50
Buffer.poolSize = 8192 // not used by this implementation

var rootParent = {}

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Use Object implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * Due to various browser bugs, sometimes the Object implementation will be used even
 * when the browser supports typed arrays.
 *
 * Note:
 *
 *   - Firefox 4-29 lacks support for adding new properties to `Uint8Array` instances,
 *     See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438.
 *
 *   - Safari 5-7 lacks support for changing the `Object.prototype.constructor` property
 *     on objects.
 *
 *   - Chrome 9-10 is missing the `TypedArray.prototype.subarray` function.
 *
 *   - IE10 has a broken `TypedArray.prototype.subarray` function which returns arrays of
 *     incorrect length in some situations.

 * We detect these buggy browsers and set `Buffer.TYPED_ARRAY_SUPPORT` to `false` so they
 * get the Object implementation, which is slower but behaves correctly.
 */
Buffer.TYPED_ARRAY_SUPPORT = global.TYPED_ARRAY_SUPPORT !== undefined
  ? global.TYPED_ARRAY_SUPPORT
  : typedArraySupport()

function typedArraySupport () {
  function Bar () {}
  try {
    var arr = new Uint8Array(1)
    arr.foo = function () { return 42 }
    arr.constructor = Bar
    return arr.foo() === 42 && // typed array instances can be augmented
        arr.constructor === Bar && // constructor can be set
        typeof arr.subarray === 'function' && // chrome 9-10 lack `subarray`
        arr.subarray(1, 1).byteLength === 0 // ie10 has broken `subarray`
  } catch (e) {
    return false
  }
}

function kMaxLength () {
  return Buffer.TYPED_ARRAY_SUPPORT
    ? 0x7fffffff
    : 0x3fffffff
}

/**
 * Class: Buffer
 * =============
 *
 * The Buffer constructor returns instances of `Uint8Array` that are augmented
 * with function properties for all the node `Buffer` API functions. We use
 * `Uint8Array` so that square bracket notation works as expected -- it returns
 * a single octet.
 *
 * By augmenting the instances, we can avoid modifying the `Uint8Array`
 * prototype.
 */
function Buffer (arg) {
  if (!(this instanceof Buffer)) {
    // Avoid going through an ArgumentsAdaptorTrampoline in the common case.
    if (arguments.length > 1) return new Buffer(arg, arguments[1])
    return new Buffer(arg)
  }

  this.length = 0
  this.parent = undefined

  // Common case.
  if (typeof arg === 'number') {
    return fromNumber(this, arg)
  }

  // Slightly less common case.
  if (typeof arg === 'string') {
    return fromString(this, arg, arguments.length > 1 ? arguments[1] : 'utf8')
  }

  // Unusual.
  return fromObject(this, arg)
}

function fromNumber (that, length) {
  that = allocate(that, length < 0 ? 0 : checked(length) | 0)
  if (!Buffer.TYPED_ARRAY_SUPPORT) {
    for (var i = 0; i < length; i++) {
      that[i] = 0
    }
  }
  return that
}

function fromString (that, string, encoding) {
  if (typeof encoding !== 'string' || encoding === '') encoding = 'utf8'

  // Assumption: byteLength() return value is always < kMaxLength.
  var length = byteLength(string, encoding) | 0
  that = allocate(that, length)

  that.write(string, encoding)
  return that
}

function fromObject (that, object) {
  if (Buffer.isBuffer(object)) return fromBuffer(that, object)

  if (isArray(object)) return fromArray(that, object)

  if (object == null) {
    throw new TypeError('must start with number, buffer, array or string')
  }

  if (typeof ArrayBuffer !== 'undefined') {
    if (object.buffer instanceof ArrayBuffer) {
      return fromTypedArray(that, object)
    }
    if (object instanceof ArrayBuffer) {
      return fromArrayBuffer(that, object)
    }
  }

  if (object.length) return fromArrayLike(that, object)

  return fromJsonObject(that, object)
}

function fromBuffer (that, buffer) {
  var length = checked(buffer.length) | 0
  that = allocate(that, length)
  buffer.copy(that, 0, 0, length)
  return that
}

function fromArray (that, array) {
  var length = checked(array.length) | 0
  that = allocate(that, length)
  for (var i = 0; i < length; i += 1) {
    that[i] = array[i] & 255
  }
  return that
}

// Duplicate of fromArray() to keep fromArray() monomorphic.
function fromTypedArray (that, array) {
  var length = checked(array.length) | 0
  that = allocate(that, length)
  // Truncating the elements is probably not what people expect from typed
  // arrays with BYTES_PER_ELEMENT > 1 but it's compatible with the behavior
  // of the old Buffer constructor.
  for (var i = 0; i < length; i += 1) {
    that[i] = array[i] & 255
  }
  return that
}

function fromArrayBuffer (that, array) {
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    // Return an augmented `Uint8Array` instance, for best performance
    array.byteLength
    that = Buffer._augment(new Uint8Array(array))
  } else {
    // Fallback: Return an object instance of the Buffer class
    that = fromTypedArray(that, new Uint8Array(array))
  }
  return that
}

function fromArrayLike (that, array) {
  var length = checked(array.length) | 0
  that = allocate(that, length)
  for (var i = 0; i < length; i += 1) {
    that[i] = array[i] & 255
  }
  return that
}

// Deserialize { type: 'Buffer', data: [1,2,3,...] } into a Buffer object.
// Returns a zero-length buffer for inputs that don't conform to the spec.
function fromJsonObject (that, object) {
  var array
  var length = 0

  if (object.type === 'Buffer' && isArray(object.data)) {
    array = object.data
    length = checked(array.length) | 0
  }
  that = allocate(that, length)

  for (var i = 0; i < length; i += 1) {
    that[i] = array[i] & 255
  }
  return that
}

if (Buffer.TYPED_ARRAY_SUPPORT) {
  Buffer.prototype.__proto__ = Uint8Array.prototype
  Buffer.__proto__ = Uint8Array
}

function allocate (that, length) {
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    // Return an augmented `Uint8Array` instance, for best performance
    that = Buffer._augment(new Uint8Array(length))
    that.__proto__ = Buffer.prototype
  } else {
    // Fallback: Return an object instance of the Buffer class
    that.length = length
    that._isBuffer = true
  }

  var fromPool = length !== 0 && length <= Buffer.poolSize >>> 1
  if (fromPool) that.parent = rootParent

  return that
}

function checked (length) {
  // Note: cannot use `length < kMaxLength` here because that fails when
  // length is NaN (which is otherwise coerced to zero.)
  if (length >= kMaxLength()) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                         'size: 0x' + kMaxLength().toString(16) + ' bytes')
  }
  return length | 0
}

function SlowBuffer (subject, encoding) {
  if (!(this instanceof SlowBuffer)) return new SlowBuffer(subject, encoding)

  var buf = new Buffer(subject, encoding)
  delete buf.parent
  return buf
}

Buffer.isBuffer = function isBuffer (b) {
  return !!(b != null && b._isBuffer)
}

Buffer.compare = function compare (a, b) {
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    throw new TypeError('Arguments must be Buffers')
  }

  if (a === b) return 0

  var x = a.length
  var y = b.length

  var i = 0
  var len = Math.min(x, y)
  while (i < len) {
    if (a[i] !== b[i]) break

    ++i
  }

  if (i !== len) {
    x = a[i]
    y = b[i]
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

Buffer.isEncoding = function isEncoding (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'binary':
    case 'base64':
    case 'raw':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.concat = function concat (list, length) {
  if (!isArray(list)) throw new TypeError('list argument must be an Array of Buffers.')

  if (list.length === 0) {
    return new Buffer(0)
  }

  var i
  if (length === undefined) {
    length = 0
    for (i = 0; i < list.length; i++) {
      length += list[i].length
    }
  }

  var buf = new Buffer(length)
  var pos = 0
  for (i = 0; i < list.length; i++) {
    var item = list[i]
    item.copy(buf, pos)
    pos += item.length
  }
  return buf
}

function byteLength (string, encoding) {
  if (typeof string !== 'string') string = '' + string

  var len = string.length
  if (len === 0) return 0

  // Use a for loop to avoid recursion
  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'ascii':
      case 'binary':
      // Deprecated
      case 'raw':
      case 'raws':
        return len
      case 'utf8':
      case 'utf-8':
        return utf8ToBytes(string).length
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return len * 2
      case 'hex':
        return len >>> 1
      case 'base64':
        return base64ToBytes(string).length
      default:
        if (loweredCase) return utf8ToBytes(string).length // assume utf8
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}
Buffer.byteLength = byteLength

// pre-set for values that may exist in the future
Buffer.prototype.length = undefined
Buffer.prototype.parent = undefined

function slowToString (encoding, start, end) {
  var loweredCase = false

  start = start | 0
  end = end === undefined || end === Infinity ? this.length : end | 0

  if (!encoding) encoding = 'utf8'
  if (start < 0) start = 0
  if (end > this.length) end = this.length
  if (end <= start) return ''

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'binary':
        return binarySlice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.toString = function toString () {
  var length = this.length | 0
  if (length === 0) return ''
  if (arguments.length === 0) return utf8Slice(this, 0, length)
  return slowToString.apply(this, arguments)
}

Buffer.prototype.equals = function equals (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function inspect () {
  var str = ''
  var max = exports.INSPECT_MAX_BYTES
  if (this.length > 0) {
    str = this.toString('hex', 0, max).match(/.{2}/g).join(' ')
    if (this.length > max) str += ' ... '
  }
  return '<Buffer ' + str + '>'
}

Buffer.prototype.compare = function compare (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return 0
  return Buffer.compare(this, b)
}

Buffer.prototype.indexOf = function indexOf (val, byteOffset) {
  if (byteOffset > 0x7fffffff) byteOffset = 0x7fffffff
  else if (byteOffset < -0x80000000) byteOffset = -0x80000000
  byteOffset >>= 0

  if (this.length === 0) return -1
  if (byteOffset >= this.length) return -1

  // Negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = Math.max(this.length + byteOffset, 0)

  if (typeof val === 'string') {
    if (val.length === 0) return -1 // special case: looking for empty string always fails
    return String.prototype.indexOf.call(this, val, byteOffset)
  }
  if (Buffer.isBuffer(val)) {
    return arrayIndexOf(this, val, byteOffset)
  }
  if (typeof val === 'number') {
    if (Buffer.TYPED_ARRAY_SUPPORT && Uint8Array.prototype.indexOf === 'function') {
      return Uint8Array.prototype.indexOf.call(this, val, byteOffset)
    }
    return arrayIndexOf(this, [ val ], byteOffset)
  }

  function arrayIndexOf (arr, val, byteOffset) {
    var foundIndex = -1
    for (var i = 0; byteOffset + i < arr.length; i++) {
      if (arr[byteOffset + i] === val[foundIndex === -1 ? 0 : i - foundIndex]) {
        if (foundIndex === -1) foundIndex = i
        if (i - foundIndex + 1 === val.length) return byteOffset + foundIndex
      } else {
        foundIndex = -1
      }
    }
    return -1
  }

  throw new TypeError('val must be string, number or Buffer')
}

// `get` is deprecated
Buffer.prototype.get = function get (offset) {
  console.log('.get() is deprecated. Access using array indexes instead.')
  return this.readUInt8(offset)
}

// `set` is deprecated
Buffer.prototype.set = function set (v, offset) {
  console.log('.set() is deprecated. Access using array indexes instead.')
  return this.writeUInt8(v, offset)
}

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  // must be an even number of digits
  var strLen = string.length
  if (strLen % 2 !== 0) throw new Error('Invalid hex string')

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; i++) {
    var parsed = parseInt(string.substr(i * 2, 2), 16)
    if (isNaN(parsed)) throw new Error('Invalid hex string')
    buf[offset + i] = parsed
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
}

function asciiWrite (buf, string, offset, length) {
  return blitBuffer(asciiToBytes(string), buf, offset, length)
}

function binaryWrite (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  return blitBuffer(base64ToBytes(string), buf, offset, length)
}

function ucs2Write (buf, string, offset, length) {
  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
}

Buffer.prototype.write = function write (string, offset, length, encoding) {
  // Buffer#write(string)
  if (offset === undefined) {
    encoding = 'utf8'
    length = this.length
    offset = 0
  // Buffer#write(string, encoding)
  } else if (length === undefined && typeof offset === 'string') {
    encoding = offset
    length = this.length
    offset = 0
  // Buffer#write(string, offset[, length][, encoding])
  } else if (isFinite(offset)) {
    offset = offset | 0
    if (isFinite(length)) {
      length = length | 0
      if (encoding === undefined) encoding = 'utf8'
    } else {
      encoding = length
      length = undefined
    }
  // legacy write(string, encoding, offset, length) - remove in v0.13
  } else {
    var swap = encoding
    encoding = offset
    offset = length | 0
    length = swap
  }

  var remaining = this.length - offset
  if (length === undefined || length > remaining) length = remaining

  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
    throw new RangeError('attempt to write outside buffer bounds')
  }

  if (!encoding) encoding = 'utf8'

  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'hex':
        return hexWrite(this, string, offset, length)

      case 'utf8':
      case 'utf-8':
        return utf8Write(this, string, offset, length)

      case 'ascii':
        return asciiWrite(this, string, offset, length)

      case 'binary':
        return binaryWrite(this, string, offset, length)

      case 'base64':
        // Warning: maxLength not taken into account in base64Write
        return base64Write(this, string, offset, length)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return ucs2Write(this, string, offset, length)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.toJSON = function toJSON () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  end = Math.min(buf.length, end)
  var res = []

  var i = start
  while (i < end) {
    var firstByte = buf[i]
    var codePoint = null
    var bytesPerSequence = (firstByte > 0xEF) ? 4
      : (firstByte > 0xDF) ? 3
      : (firstByte > 0xBF) ? 2
      : 1

    if (i + bytesPerSequence <= end) {
      var secondByte, thirdByte, fourthByte, tempCodePoint

      switch (bytesPerSequence) {
        case 1:
          if (firstByte < 0x80) {
            codePoint = firstByte
          }
          break
        case 2:
          secondByte = buf[i + 1]
          if ((secondByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F)
            if (tempCodePoint > 0x7F) {
              codePoint = tempCodePoint
            }
          }
          break
        case 3:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F)
            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
              codePoint = tempCodePoint
            }
          }
          break
        case 4:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          fourthByte = buf[i + 3]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F)
            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
              codePoint = tempCodePoint
            }
          }
      }
    }

    if (codePoint === null) {
      // we did not generate a valid codePoint so insert a
      // replacement char (U+FFFD) and advance only 1 byte
      codePoint = 0xFFFD
      bytesPerSequence = 1
    } else if (codePoint > 0xFFFF) {
      // encode to utf16 (surrogate pair dance)
      codePoint -= 0x10000
      res.push(codePoint >>> 10 & 0x3FF | 0xD800)
      codePoint = 0xDC00 | codePoint & 0x3FF
    }

    res.push(codePoint)
    i += bytesPerSequence
  }

  return decodeCodePointsArray(res)
}

// Based on http://stackoverflow.com/a/22747272/680742, the browser with
// the lowest limit is Chrome, with 0x10000 args.
// We go 1 magnitude less, for safety
var MAX_ARGUMENTS_LENGTH = 0x1000

function decodeCodePointsArray (codePoints) {
  var len = codePoints.length
  if (len <= MAX_ARGUMENTS_LENGTH) {
    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
  }

  // Decode in chunks to avoid "call stack size exceeded".
  var res = ''
  var i = 0
  while (i < len) {
    res += String.fromCharCode.apply(
      String,
      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
    )
  }
  return res
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++) {
    ret += String.fromCharCode(buf[i] & 0x7F)
  }
  return ret
}

function binarySlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; i++) {
    out += toHex(buf[i])
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + bytes[i + 1] * 256)
  }
  return res
}

Buffer.prototype.slice = function slice (start, end) {
  var len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len
    if (start < 0) start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0) end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start) end = start

  var newBuf
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    newBuf = Buffer._augment(this.subarray(start, end))
  } else {
    var sliceLen = end - start
    newBuf = new Buffer(sliceLen, undefined)
    for (var i = 0; i < sliceLen; i++) {
      newBuf[i] = this[i + start]
    }
  }

  if (newBuf.length) newBuf.parent = this.parent || this

  return newBuf
}

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }

  return val
}

Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) {
    checkOffset(offset, byteLength, this.length)
  }

  var val = this[offset + --byteLength]
  var mul = 1
  while (byteLength > 0 && (mul *= 0x100)) {
    val += this[offset + --byteLength] * mul
  }

  return val
}

Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
    ((this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    this[offset + 3])
}

Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var i = byteLength
  var mul = 1
  var val = this[offset + --i]
  while (i > 0 && (mul *= 0x100)) {
    val += this[offset + --i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80)) return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16) |
    (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
    (this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    (this[offset + 3])
}

Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('buffer must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('value is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('index out of range')
}

Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkInt(this, value, offset, byteLength, Math.pow(2, 8 * byteLength), 0)

  var mul = 1
  var i = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkInt(this, value, offset, byteLength, Math.pow(2, 8 * byteLength), 0)

  var i = byteLength - 1
  var mul = 1
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value)
  this[offset] = (value & 0xff)
  return offset + 1
}

function objectWriteUInt16 (buf, value, offset, littleEndian) {
  if (value < 0) value = 0xffff + value + 1
  for (var i = 0, j = Math.min(buf.length - offset, 2); i < j; i++) {
    buf[offset + i] = (value & (0xff << (8 * (littleEndian ? i : 1 - i)))) >>>
      (littleEndian ? i : 1 - i) * 8
  }
}

Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value & 0xff)
    this[offset + 1] = (value >>> 8)
  } else {
    objectWriteUInt16(this, value, offset, true)
  }
  return offset + 2
}

Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 8)
    this[offset + 1] = (value & 0xff)
  } else {
    objectWriteUInt16(this, value, offset, false)
  }
  return offset + 2
}

function objectWriteUInt32 (buf, value, offset, littleEndian) {
  if (value < 0) value = 0xffffffff + value + 1
  for (var i = 0, j = Math.min(buf.length - offset, 4); i < j; i++) {
    buf[offset + i] = (value >>> (littleEndian ? i : 3 - i) * 8) & 0xff
  }
}

Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset + 3] = (value >>> 24)
    this[offset + 2] = (value >>> 16)
    this[offset + 1] = (value >>> 8)
    this[offset] = (value & 0xff)
  } else {
    objectWriteUInt32(this, value, offset, true)
  }
  return offset + 4
}

Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 24)
    this[offset + 1] = (value >>> 16)
    this[offset + 2] = (value >>> 8)
    this[offset + 3] = (value & 0xff)
  } else {
    objectWriteUInt32(this, value, offset, false)
  }
  return offset + 4
}

Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) {
    var limit = Math.pow(2, 8 * byteLength - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = 0
  var mul = 1
  var sub = value < 0 ? 1 : 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) {
    var limit = Math.pow(2, 8 * byteLength - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = byteLength - 1
  var mul = 1
  var sub = value < 0 ? 1 : 0
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value)
  if (value < 0) value = 0xff + value + 1
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value & 0xff)
    this[offset + 1] = (value >>> 8)
  } else {
    objectWriteUInt16(this, value, offset, true)
  }
  return offset + 2
}

Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 8)
    this[offset + 1] = (value & 0xff)
  } else {
    objectWriteUInt16(this, value, offset, false)
  }
  return offset + 2
}

Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value & 0xff)
    this[offset + 1] = (value >>> 8)
    this[offset + 2] = (value >>> 16)
    this[offset + 3] = (value >>> 24)
  } else {
    objectWriteUInt32(this, value, offset, true)
  }
  return offset + 4
}

Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 24)
    this[offset + 1] = (value >>> 16)
    this[offset + 2] = (value >>> 8)
    this[offset + 3] = (value & 0xff)
  } else {
    objectWriteUInt32(this, value, offset, false)
  }
  return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (value > max || value < min) throw new RangeError('value is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('index out of range')
  if (offset < 0) throw new RangeError('index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }
  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }
  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function copy (target, targetStart, start, end) {
  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (targetStart >= target.length) targetStart = target.length
  if (!targetStart) targetStart = 0
  if (end > 0 && end < start) end = start

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || this.length === 0) return 0

  // Fatal error conditions
  if (targetStart < 0) {
    throw new RangeError('targetStart out of bounds')
  }
  if (start < 0 || start >= this.length) throw new RangeError('sourceStart out of bounds')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length) end = this.length
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start
  }

  var len = end - start
  var i

  if (this === target && start < targetStart && targetStart < end) {
    // descending copy from end
    for (i = len - 1; i >= 0; i--) {
      target[i + targetStart] = this[i + start]
    }
  } else if (len < 1000 || !Buffer.TYPED_ARRAY_SUPPORT) {
    // ascending copy from start
    for (i = 0; i < len; i++) {
      target[i + targetStart] = this[i + start]
    }
  } else {
    target._set(this.subarray(start, start + len), targetStart)
  }

  return len
}

// fill(value, start=0, end=buffer.length)
Buffer.prototype.fill = function fill (value, start, end) {
  if (!value) value = 0
  if (!start) start = 0
  if (!end) end = this.length

  if (end < start) throw new RangeError('end < start')

  // Fill 0 bytes; we're done
  if (end === start) return
  if (this.length === 0) return

  if (start < 0 || start >= this.length) throw new RangeError('start out of bounds')
  if (end < 0 || end > this.length) throw new RangeError('end out of bounds')

  var i
  if (typeof value === 'number') {
    for (i = start; i < end; i++) {
      this[i] = value
    }
  } else {
    var bytes = utf8ToBytes(value.toString())
    var len = bytes.length
    for (i = start; i < end; i++) {
      this[i] = bytes[i % len]
    }
  }

  return this
}

/**
 * Creates a new `ArrayBuffer` with the *copied* memory of the buffer instance.
 * Added in Node 0.12. Only available in browsers that support ArrayBuffer.
 */
Buffer.prototype.toArrayBuffer = function toArrayBuffer () {
  if (typeof Uint8Array !== 'undefined') {
    if (Buffer.TYPED_ARRAY_SUPPORT) {
      return (new Buffer(this)).buffer
    } else {
      var buf = new Uint8Array(this.length)
      for (var i = 0, len = buf.length; i < len; i += 1) {
        buf[i] = this[i]
      }
      return buf.buffer
    }
  } else {
    throw new TypeError('Buffer.toArrayBuffer not supported in this browser')
  }
}

// HELPER FUNCTIONS
// ================

var BP = Buffer.prototype

/**
 * Augment a Uint8Array *instance* (not the Uint8Array class!) with Buffer methods
 */
Buffer._augment = function _augment (arr) {
  arr.constructor = Buffer
  arr._isBuffer = true

  // save reference to original Uint8Array set method before overwriting
  arr._set = arr.set

  // deprecated
  arr.get = BP.get
  arr.set = BP.set

  arr.write = BP.write
  arr.toString = BP.toString
  arr.toLocaleString = BP.toString
  arr.toJSON = BP.toJSON
  arr.equals = BP.equals
  arr.compare = BP.compare
  arr.indexOf = BP.indexOf
  arr.copy = BP.copy
  arr.slice = BP.slice
  arr.readUIntLE = BP.readUIntLE
  arr.readUIntBE = BP.readUIntBE
  arr.readUInt8 = BP.readUInt8
  arr.readUInt16LE = BP.readUInt16LE
  arr.readUInt16BE = BP.readUInt16BE
  arr.readUInt32LE = BP.readUInt32LE
  arr.readUInt32BE = BP.readUInt32BE
  arr.readIntLE = BP.readIntLE
  arr.readIntBE = BP.readIntBE
  arr.readInt8 = BP.readInt8
  arr.readInt16LE = BP.readInt16LE
  arr.readInt16BE = BP.readInt16BE
  arr.readInt32LE = BP.readInt32LE
  arr.readInt32BE = BP.readInt32BE
  arr.readFloatLE = BP.readFloatLE
  arr.readFloatBE = BP.readFloatBE
  arr.readDoubleLE = BP.readDoubleLE
  arr.readDoubleBE = BP.readDoubleBE
  arr.writeUInt8 = BP.writeUInt8
  arr.writeUIntLE = BP.writeUIntLE
  arr.writeUIntBE = BP.writeUIntBE
  arr.writeUInt16LE = BP.writeUInt16LE
  arr.writeUInt16BE = BP.writeUInt16BE
  arr.writeUInt32LE = BP.writeUInt32LE
  arr.writeUInt32BE = BP.writeUInt32BE
  arr.writeIntLE = BP.writeIntLE
  arr.writeIntBE = BP.writeIntBE
  arr.writeInt8 = BP.writeInt8
  arr.writeInt16LE = BP.writeInt16LE
  arr.writeInt16BE = BP.writeInt16BE
  arr.writeInt32LE = BP.writeInt32LE
  arr.writeInt32BE = BP.writeInt32BE
  arr.writeFloatLE = BP.writeFloatLE
  arr.writeFloatBE = BP.writeFloatBE
  arr.writeDoubleLE = BP.writeDoubleLE
  arr.writeDoubleBE = BP.writeDoubleBE
  arr.fill = BP.fill
  arr.inspect = BP.inspect
  arr.toArrayBuffer = BP.toArrayBuffer

  return arr
}

var INVALID_BASE64_RE = /[^+\/0-9A-Za-z-_]/g

function base64clean (str) {
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = stringtrim(str).replace(INVALID_BASE64_RE, '')
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function stringtrim (str) {
  if (str.trim) return str.trim()
  return str.replace(/^\s+|\s+$/g, '')
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (string, units) {
  units = units || Infinity
  var codePoint
  var length = string.length
  var leadSurrogate = null
  var bytes = []

  for (var i = 0; i < length; i++) {
    codePoint = string.charCodeAt(i)

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (!leadSurrogate) {
        // no lead yet
        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        }

        // valid lead
        leadSurrogate = codePoint

        continue
      }

      // 2 leads in a row
      if (codePoint < 0xDC00) {
        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
        leadSurrogate = codePoint
        continue
      }

      // valid surrogate pair
      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
    }

    leadSurrogate = null

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint)
    } else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x110000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    if ((units -= 2) < 0) break

    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; i++) {
    if ((i + offset >= dst.length) || (i >= src.length)) break
    dst[i + offset] = src[i]
  }
  return i
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"base64-js":2,"ieee754":3,"isarray":4}],2:[function(require,module,exports){
var lookup = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

;(function (exports) {
	'use strict';

  var Arr = (typeof Uint8Array !== 'undefined')
    ? Uint8Array
    : Array

	var PLUS   = '+'.charCodeAt(0)
	var SLASH  = '/'.charCodeAt(0)
	var NUMBER = '0'.charCodeAt(0)
	var LOWER  = 'a'.charCodeAt(0)
	var UPPER  = 'A'.charCodeAt(0)
	var PLUS_URL_SAFE = '-'.charCodeAt(0)
	var SLASH_URL_SAFE = '_'.charCodeAt(0)

	function decode (elt) {
		var code = elt.charCodeAt(0)
		if (code === PLUS ||
		    code === PLUS_URL_SAFE)
			return 62 // '+'
		if (code === SLASH ||
		    code === SLASH_URL_SAFE)
			return 63 // '/'
		if (code < NUMBER)
			return -1 //no match
		if (code < NUMBER + 10)
			return code - NUMBER + 26 + 26
		if (code < UPPER + 26)
			return code - UPPER
		if (code < LOWER + 26)
			return code - LOWER + 26
	}

	function b64ToByteArray (b64) {
		var i, j, l, tmp, placeHolders, arr

		if (b64.length % 4 > 0) {
			throw new Error('Invalid string. Length must be a multiple of 4')
		}

		// the number of equal signs (place holders)
		// if there are two placeholders, than the two characters before it
		// represent one byte
		// if there is only one, then the three characters before it represent 2 bytes
		// this is just a cheap hack to not do indexOf twice
		var len = b64.length
		placeHolders = '=' === b64.charAt(len - 2) ? 2 : '=' === b64.charAt(len - 1) ? 1 : 0

		// base64 is 4/3 + up to two characters of the original data
		arr = new Arr(b64.length * 3 / 4 - placeHolders)

		// if there are placeholders, only get up to the last complete 4 chars
		l = placeHolders > 0 ? b64.length - 4 : b64.length

		var L = 0

		function push (v) {
			arr[L++] = v
		}

		for (i = 0, j = 0; i < l; i += 4, j += 3) {
			tmp = (decode(b64.charAt(i)) << 18) | (decode(b64.charAt(i + 1)) << 12) | (decode(b64.charAt(i + 2)) << 6) | decode(b64.charAt(i + 3))
			push((tmp & 0xFF0000) >> 16)
			push((tmp & 0xFF00) >> 8)
			push(tmp & 0xFF)
		}

		if (placeHolders === 2) {
			tmp = (decode(b64.charAt(i)) << 2) | (decode(b64.charAt(i + 1)) >> 4)
			push(tmp & 0xFF)
		} else if (placeHolders === 1) {
			tmp = (decode(b64.charAt(i)) << 10) | (decode(b64.charAt(i + 1)) << 4) | (decode(b64.charAt(i + 2)) >> 2)
			push((tmp >> 8) & 0xFF)
			push(tmp & 0xFF)
		}

		return arr
	}

	function uint8ToBase64 (uint8) {
		var i,
			extraBytes = uint8.length % 3, // if we have 1 byte left, pad 2 bytes
			output = "",
			temp, length

		function encode (num) {
			return lookup.charAt(num)
		}

		function tripletToBase64 (num) {
			return encode(num >> 18 & 0x3F) + encode(num >> 12 & 0x3F) + encode(num >> 6 & 0x3F) + encode(num & 0x3F)
		}

		// go through the array every three bytes, we'll deal with trailing stuff later
		for (i = 0, length = uint8.length - extraBytes; i < length; i += 3) {
			temp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2])
			output += tripletToBase64(temp)
		}

		// pad the end with zeros, but make sure to not forget the extra bytes
		switch (extraBytes) {
			case 1:
				temp = uint8[uint8.length - 1]
				output += encode(temp >> 2)
				output += encode((temp << 4) & 0x3F)
				output += '=='
				break
			case 2:
				temp = (uint8[uint8.length - 2] << 8) + (uint8[uint8.length - 1])
				output += encode(temp >> 10)
				output += encode((temp >> 4) & 0x3F)
				output += encode((temp << 2) & 0x3F)
				output += '='
				break
		}

		return output
	}

	exports.toByteArray = b64ToByteArray
	exports.fromByteArray = uint8ToBase64
}(typeof exports === 'undefined' ? (this.base64js = {}) : exports))

},{}],3:[function(require,module,exports){
exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m
  var eLen = nBytes * 8 - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var nBits = -7
  var i = isLE ? (nBytes - 1) : 0
  var d = isLE ? -1 : 1
  var s = buffer[offset + i]

  i += d

  e = s & ((1 << (-nBits)) - 1)
  s >>= (-nBits)
  nBits += eLen
  for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1)
  e >>= (-nBits)
  nBits += mLen
  for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen)
    e = e - eBias
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c
  var eLen = nBytes * 8 - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
  var i = isLE ? 0 : (nBytes - 1)
  var d = isLE ? 1 : -1
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

  value = Math.abs(value)

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0
    e = eMax
  } else {
    e = Math.floor(Math.log(value) / Math.LN2)
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--
      c *= 2
    }
    if (e + eBias >= 1) {
      value += rt / c
    } else {
      value += rt * Math.pow(2, 1 - eBias)
    }
    if (value * c >= 2) {
      e++
      c /= 2
    }

    if (e + eBias >= eMax) {
      m = 0
      e = eMax
    } else if (e + eBias >= 1) {
      m = (value * c - 1) * Math.pow(2, mLen)
      e = e + eBias
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
      e = 0
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m
  eLen += mLen
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128
}

},{}],4:[function(require,module,exports){
var toString = {}.toString;

module.exports = Array.isArray || function (arr) {
  return toString.call(arr) == '[object Array]';
};

},{}],5:[function(require,module,exports){
//
// # class-manipulator
//
// A chainable wrapper API for manipulating a DOM Element's classes or class strings.
//

/* global module */

//
// ## Public API
//

//
// **list(element) / list(classString)**
//
// Creates a chainable API for manipulating an element's list of classes. No changes
// are made to the DOM Element unless `.apply()` is called.
//
//     DOMElement|string -> object
//

function list (element) {
    
    element = typeof element === "object" ? element : dummy(element);
    
    var classes = parse(element), controls;
    
//
// **.apply()**
//
// Applies class list to the source element.
//
//     void -> object
//
    
    function apply () {
        element.setAttribute("class", toString());
        return controls;
    }
    
//
// **.add(name)**
//
// Adds a class to the element's list of class names.
//
//     string -> object
//
    
    function add (name) {
        
        if (hasSpaces(name)) {
            return addMany(classStringToArray(name));
        }
        
        if (!has(name)) {
            classes.push(name);
        }
        
        return controls;
    }
    
//
// **.addMany(names)**
//
// Adds many classes to the list at once.
//
//     [string] -> object
//
    
    function addMany (newClasses) {
        
        if (!Array.isArray(newClasses)) {
            return add(newClasses);
        }
        
        newClasses.forEach(add);
        
        return controls;
    }
    
//
// **.has(name)**
//
// Checks whether a class is in the element's list of class names.
//
//     string -> boolean
//
    
    function has (name) {
        
        if (hasSpaces(name)) {
            return hasAll(name);
        }
        
        return classes.indexOf(name) >= 0;
    }
    
//
// **.hasSome(names)**
//
// Checks whether the list contains at least one of the supplied classes.
//
//     [string] -> boolean
//
    
    function hasSome (names) {
        return Array.isArray(names) ?
            names.some(has) :
            hasSome(classStringToArray(names));
    }
    
//
// **.hasAll(names)**
//
// Checks whether the list contains all of the supplied classes.
//
//     [string] -> boolean
//
    
    function hasAll (names) {
        return Array.isArray(names) ?
            names.every(has) :
            hasAll(classStringToArray(names));
    }
    
//
// **.remove(name)**
//
// Removes a class from the element's list of class names.
//
//     string -> object
//
    
    function remove (name) {
        
        if (hasSpaces(name)) {
            return removeMany(classStringToArray(name));
        }
        
        if (has(name)) {
            classes.splice(classes.indexOf(name), 1);
        }
        
        return controls;
    }
    
//
// **.removeMany(names)**
//
// Removes many classes from the list at once.
//
//     [string] -> object
//
    
    function removeMany (toRemove) {
        
        if (!Array.isArray(toRemove)) {
            return remove(toRemove);
        }
        
        toRemove.forEach(remove);
        
        return controls;
    }
    
//
// **.toggle(name)**
//
// Removes a class from the class list when it's present or adds it to the list when it's not.
//
//     string -> object
//
    
    function toggle (name) {
        
        if (hasSpaces(name)) {
            return toggleMany(classStringToArray(name));
        }
        
        return (has(name) ? remove(name) : add(name));
    }
    
//
// **.toggleMany(names)**
//
// Toggles many classes at once.
//
//     [string] -> object
//
    
    function toggleMany (names) {
        
        if (Array.isArray(names)) {
            names.forEach(toggle);
            return controls;
        }
        
        return toggleMany(classStringToArray(names));
    }
    
//
// **.toArray()**
//
// Creates an array containing all of the list's class names.
//
//     void -> [string]
//
    
    function toArray () {
        return classes.slice();
    }
    
//
// **.toString()**
//
// Returns a string containing all the classes in the list separated by a space character.
//
    
    function toString () {
        return classes.join(" ");
    }
    
//
// **.copyTo(otherElement)**
//
// Creates a new empty list for another element and copies the source element's class list to it.
//
//     DOM Element -> object
//
    
    function copyTo (otherElement) {
        return list(otherElement).clear().addMany(classes);
    }
    
//
// **.clear()**
//
// Removes all classes from the list.
//
//     void -> object
//
    
    function clear () {
        classes.length = 0;
        return controls;
    }
    
//
// **.filter(fn)**
//
// Removes those class names from the list that fail a predicate test function.
//
//     (string -> number -> object -> boolean) -> object
//
    
    function filter (fn) {
        
        classes.forEach(function (name, i) {
            if (!fn(name, i, controls)) {
                remove(name);
            }
        });
        
        return controls;
    }
    
//
// **.sort([fn])**
//
// Sorts the names in place. A custom sort function can be applied optionally. It must have
// the same signature as JS Array.prototype.sort() callbacks.
//
//     void|function -> object
//
    
    function sort (fn) {
        classes.sort(fn);
        return controls;
    }
    
//
// **.size()**
//
// Returns the number of classes in the list.
//
//     void -> number
//
    
    function size () {
        return classes.length;
    }
    
    controls = {
        add: add,
        addMany: addMany,
        has: has,
        hasSome: hasSome,
        hasAll: hasAll,
        remove: remove,
        removeMany: removeMany,
        toggle: toggle,
        toggleMany: toggleMany,
        apply: apply,
        clear: clear,
        copyTo: copyTo,
        toArray: toArray,
        toString: toString,
        filter: filter,
        sort: sort,
        size: size
    };
    
    return controls;
}

//
// **add(element, name)**
//
// Adds a class to a DOM Element.
//
//    DOM Element -> string -> object
//

function add (element, name) {
    return list(element).add(name).apply();
}

//
// **remove(element, name)**
//
// Removes a class from a DOM Element.
//
//     DOM Element -> string -> object
//

function remove (element, name) {
    return list(element).remove(name).apply();
}

//
// **toggle(element, name)**
//
// Removes a class from a DOM Element when it has the class or adds it when the element doesn't
// have it.
//
//     DOMElement -> string -> object
//

function toggle (element, name) {
    return list(element).toggle(name).apply();
}

//
// **has(element, name)**
//
// Checks whether a DOM Element has a class.
//
//     DOMElement -> string -> boolean
//

function has (element, name) {
    return list(element).has(name);
}

//
// ## Exported functions
//

module.exports = {
    add: add,
    remove: remove,
    toggle: toggle,
    has: has,
    list: list
};


//
// ## Private functions
//

//
// Extracts the class names from a DOM Element and returns them in an array.
//
//     DOMElement -> [string]
//

function parse (element) {
    return classStringToArray(element.getAttribute("class") || "");
}

//
//     string -> [string]
//

function classStringToArray (classString) {
    return ("" + classString).replace(/\s+/, " ").trim().split(" ").filter(stringNotEmpty);
}

//
//     string -> boolean
//

function stringNotEmpty (str) {
    return str !== "";
}

//
//     string -> boolean
//

function hasSpaces (str) {
    return !!str.match(/\s/);
}

//
// Creates a dummy DOMElement for when we don't have an actual one for a list.
//
//     string -> object
//

function dummy (classList) {
    
    if (typeof classList !== "string") {
        throw new Error("Function list() expects an object or string as its argument.");
    }
    
    var attributes = {
        "class": "" + classStringToArray(classList).join(" ")
    };
    
    return {
        setAttribute: function (name, value) { attributes[name] = value; },
        getAttribute: function (name) { return attributes[name]; }
    };
}

},{}],6:[function(require,module,exports){
(function (Buffer){
var clone = (function() {
'use strict';

/**
 * Clones (copies) an Object using deep copying.
 *
 * This function supports circular references by default, but if you are certain
 * there are no circular references in your object, you can save some CPU time
 * by calling clone(obj, false).
 *
 * Caution: if `circular` is false and `parent` contains circular references,
 * your program may enter an infinite loop and crash.
 *
 * @param `parent` - the object to be cloned
 * @param `circular` - set to true if the object to be cloned may contain
 *    circular references. (optional - true by default)
 * @param `depth` - set to a number if the object is only to be cloned to
 *    a particular depth. (optional - defaults to Infinity)
 * @param `prototype` - sets the prototype to be used when cloning an object.
 *    (optional - defaults to parent prototype).
*/
function clone(parent, circular, depth, prototype) {
  var filter;
  if (typeof circular === 'object') {
    depth = circular.depth;
    prototype = circular.prototype;
    filter = circular.filter;
    circular = circular.circular
  }
  // maintain two arrays for circular references, where corresponding parents
  // and children have the same index
  var allParents = [];
  var allChildren = [];

  var useBuffer = typeof Buffer != 'undefined';

  if (typeof circular == 'undefined')
    circular = true;

  if (typeof depth == 'undefined')
    depth = Infinity;

  // recurse this function so we don't reset allParents and allChildren
  function _clone(parent, depth) {
    // cloning null always returns null
    if (parent === null)
      return null;

    if (depth == 0)
      return parent;

    var child;
    var proto;
    if (typeof parent != 'object') {
      return parent;
    }

    if (clone.__isArray(parent)) {
      child = [];
    } else if (clone.__isRegExp(parent)) {
      child = new RegExp(parent.source, __getRegExpFlags(parent));
      if (parent.lastIndex) child.lastIndex = parent.lastIndex;
    } else if (clone.__isDate(parent)) {
      child = new Date(parent.getTime());
    } else if (useBuffer && Buffer.isBuffer(parent)) {
      child = new Buffer(parent.length);
      parent.copy(child);
      return child;
    } else {
      if (typeof prototype == 'undefined') {
        proto = Object.getPrototypeOf(parent);
        child = Object.create(proto);
      }
      else {
        child = Object.create(prototype);
        proto = prototype;
      }
    }

    if (circular) {
      var index = allParents.indexOf(parent);

      if (index != -1) {
        return allChildren[index];
      }
      allParents.push(parent);
      allChildren.push(child);
    }

    for (var i in parent) {
      var attrs;
      if (proto) {
        attrs = Object.getOwnPropertyDescriptor(proto, i);
      }

      if (attrs && attrs.set == null) {
        continue;
      }
      child[i] = _clone(parent[i], depth - 1);
    }

    return child;
  }

  return _clone(parent, depth);
}

/**
 * Simple flat clone using prototype, accepts only objects, usefull for property
 * override on FLAT configuration object (no nested props).
 *
 * USE WITH CAUTION! This may not behave as you wish if you do not know how this
 * works.
 */
clone.clonePrototype = function clonePrototype(parent) {
  if (parent === null)
    return null;

  var c = function () {};
  c.prototype = parent;
  return new c();
};

// private utility functions

function __objToStr(o) {
  return Object.prototype.toString.call(o);
};
clone.__objToStr = __objToStr;

function __isDate(o) {
  return typeof o === 'object' && __objToStr(o) === '[object Date]';
};
clone.__isDate = __isDate;

function __isArray(o) {
  return typeof o === 'object' && __objToStr(o) === '[object Array]';
};
clone.__isArray = __isArray;

function __isRegExp(o) {
  return typeof o === 'object' && __objToStr(o) === '[object RegExp]';
};
clone.__isRegExp = __isRegExp;

function __getRegExpFlags(re) {
  var flags = '';
  if (re.global) flags += 'g';
  if (re.ignoreCase) flags += 'i';
  if (re.multiline) flags += 'm';
  return flags;
};
clone.__getRegExpFlags = __getRegExpFlags;

return clone;
})();

if (typeof module === 'object' && module.exports) {
  module.exports = clone;
}

}).call(this,require("buffer").Buffer)
},{"buffer":1}],7:[function(require,module,exports){
(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define(factory);
    } else if (typeof exports === 'object') {
        module.exports = factory();
    } else {
        root.deepmerge = factory();
    }
}(this, function () {

return function deepmerge(target, src) {
    var array = Array.isArray(src);
    var dst = array && [] || {};

    if (array) {
        target = target || [];
        dst = dst.concat(target);
        src.forEach(function(e, i) {
            if (typeof dst[i] === 'undefined') {
                dst[i] = e;
            } else if (typeof e === 'object') {
                dst[i] = deepmerge(target[i], e);
            } else {
                if (target.indexOf(e) === -1) {
                    dst.push(e);
                }
            }
        });
    } else {
        if (target && typeof target === 'object') {
            Object.keys(target).forEach(function (key) {
                dst[key] = target[key];
            })
        }
        Object.keys(src).forEach(function (key) {
            if (typeof src[key] !== 'object' || !src[key]) {
                dst[key] = src[key];
            }
            else {
                if (!target[key]) {
                    dst[key] = src[key];
                } else {
                    dst[key] = deepmerge(target[key], src[key]);
                }
            }
        });
    }

    return dst;
}

}));

},{}],8:[function(require,module,exports){

function apply (fn, args) {
    
    if (typeof fn !== "function") {
        throw new TypeError("Argument 'fn' must be a function.");
    }
    
    return fn.apply(undefined, args);
}

module.exports = apply;

},{}],9:[function(require,module,exports){

var slice = require("./slice");
var apply = require("./apply");

//
// **auto(fn[, arity])**
//
// Wraps `fn` so that if it is called with less arguments than `fn`'s arity,
// a partial application is done instead of calling the function. This means that you can do this:
//
//     each(fn)(collection);
//
// Instead of this:
//
//     each(fn, collection);
//

function auto (fn, arity) {
    
    arity = arguments.length >= 2 ? arity : fn.length;
    
    function wrap () {
        
        var args = slice(arguments);
        
        return (
            args.length >= arity ?
            apply(fn, args) :
            function () { return apply(wrap, args.concat(slice(arguments))); }
        );
    }
    
    return wrap;
}

module.exports = auto;

},{"./apply":8,"./slice":15}],10:[function(require,module,exports){

var apply = require("./apply");
var pipe = require("./pipe");
var toArray = require("./toArray");

function compose () {
    
    var functions = toArray(arguments);
    
    return function (value) {
        
        var args = functions.slice();
        
        args.unshift(value);
        
        return apply(pipe, args);
    };
}

module.exports = compose;

},{"./apply":8,"./pipe":14,"./toArray":16}],11:[function(require,module,exports){

var types = require("enjoy-typechecks");
var auto = require("./auto");

function eachInArray (fn, collection) {
    [].forEach.call(collection, fn);
}

function eachInObject (fn, collection) {
    Object.keys(collection).forEach(function (key) {
        fn(collection[key], key, collection);
    });
}

function each (fn, collection) {
    return types.isArrayLike(collection) ?
        eachInArray(fn, collection) :
        eachInObject(fn, collection);
}

module.exports = auto(each);

},{"./auto":9,"enjoy-typechecks":13}],12:[function(require,module,exports){

function free (method) {
    return Function.prototype.call.bind(method);
}

module.exports = free;

},{}],13:[function(require,module,exports){
/* eslint no-self-compare: off */

function isNull (a) {
    return a === null;
}

function isUndefined (a) {
    return typeof a === "undefined";
}

function isBoolean (a) {
    return typeof a === "boolean";
}

function isNumber (a) {
    return typeof a === "number";
}

function isFiniteNumber (a) {
    return isNumber(a) && isFinite(a);
}

function isInfiniteNumber (a) {
    return isNumber(a) && !isFinite(a);
}

function isInfinity (a) {
    return isPositiveInfinity(a) || isNegativeInfinity(a);
}

function isPositiveInfinity (a) {
    return a === Number.POSITIVE_INFINITY;
}

function isNegativeInfinity (a) {
    return a === Number.NEGATIVE_INFINITY;
}

function isNaN (a) {
    return a !== a;
}

//
// Checks if a number is an integer. Please note that there's currently no way
// to identify "x.000" and similar as either integer or float in JavaScript because
// those are automatically truncated to "x".
//
function isInteger (n) {
    return isFiniteNumber(n) && n % 1 === 0;
}

function isFloat (n) {
    return isFiniteNumber(n) && n % 1 !== 0;
}

function isString (a) {
    return typeof a === "string";
}

function isChar (a) {
    return isString(a) && a.length === 1;
}

function isCollection (a) {
    return isObject(a) || isArray(a);
}

function isObject (a) {
    return typeof a === "object" && a !== null;
}

function isArray (a) {
    return Array.isArray(a);
}

function isArrayLike (a) {
    return (isArray(a) || isString(a) || (
        isObject(a) && ("length" in a) && isFiniteNumber(a.length) && (
            (a.length > 0 && (a.length - 1) in a) ||
            (a.length === 0)
        )
    ));
}

function isFunction (a) {
    return typeof a === "function";
}

function isPrimitive (a) {
    return isNull(a) || isUndefined(a) || isNumber(a) || isString(a) || isBoolean(a);
}

function isDate (a) {
    return isObject(a) && Object.prototype.toString.call(a) === "[object Date]";
}

function isRegExp (a) {
    return isObject(a) && Object.prototype.toString.call(a) === "[object RegExp]";
}

function isError (a) {
    return isObject(a) && Object.prototype.toString.call(a) === "[object Error]";
}

function isArgumentsObject (a) {
    return isObject(a) && Object.prototype.toString.call(a) === "[object Arguments]";
}

function isMathObject (a) {
    return a === Math;
}

function isType (a) {
    return isDerivable(a) && a.$__type__ === "type" && isFunction(a.$__checker__);
}

function isDerivable (a) {
    return isObject(a) && "$__children__" in a && Array.isArray(a.$__children__);
}

function isMethod (a) {
    return isFunction(a) && a.$__type__ === "method" && isFunction(a.$__default__) &&
        isArray(a.$__implementations__) && isArray(a.$__dispatchers__);
}

module.exports = {
    isArgumentsObject: isArgumentsObject,
    isArray: isArray,
    isArrayLike: isArrayLike,
    isBoolean: isBoolean,
    isChar: isChar,
    isCollection: isCollection,
    isDate: isDate,
    isDerivable: isDerivable,
    isError: isError,
    isFiniteNumber: isFiniteNumber,
    isFloat: isFloat,
    isFunction: isFunction,
    isInfiniteNumber: isInfiniteNumber,
    isInfinity: isInfinity,
    isInteger: isInteger,
    isMathObject: isMathObject,
    isMethod: isMethod,
    isNaN: isNaN,
    isNegativeInfinity: isNegativeInfinity,
    isNull: isNull,
    isNumber: isNumber,
    isPositiveInfinity: isPositiveInfinity,
    isPrimitive: isPrimitive,
    isRegExp: isRegExp,
    isString: isString,
    isType: isType,
    isUndefined: isUndefined
};

},{}],14:[function(require,module,exports){

var each = require("./each");
var auto = require("./auto");

function pipe (value) {
    
    each(function (fn, index) {
        if (index > 0) {
            value = fn(value);
        }
    }, arguments);
    
    return value;
}

module.exports = auto(pipe, 2);

},{"./auto":9,"./each":11}],15:[function(require,module,exports){

var free = require("./free");

module.exports = free(Array.prototype.slice);

},{"./free":12}],16:[function(require,module,exports){

function toArray (thing) {
    return Array.prototype.slice.call(thing);
}

module.exports = toArray;

},{}],17:[function(require,module,exports){
/*!
 *  howler.js v1.1.28
 *  howlerjs.com
 *
 *  (c) 2013-2015, James Simpson of GoldFire Studios
 *  goldfirestudios.com
 *
 *  MIT License
 */

(function() {
  // setup
  var cache = {};

  // setup the audio context
  var ctx = null,
    usingWebAudio = true,
    noAudio = false;
  try {
    if (typeof AudioContext !== 'undefined') {
      ctx = new AudioContext();
    } else if (typeof webkitAudioContext !== 'undefined') {
      ctx = new webkitAudioContext();
    } else {
      usingWebAudio = false;
    }
  } catch(e) {
    usingWebAudio = false;
  }

  if (!usingWebAudio) {
    if (typeof Audio !== 'undefined') {
      try {
        new Audio();
      } catch(e) {
        noAudio = true;
      }
    } else {
      noAudio = true;
    }
  }

  // create a master gain node
  if (usingWebAudio) {
    var masterGain = (typeof ctx.createGain === 'undefined') ? ctx.createGainNode() : ctx.createGain();
    masterGain.gain.value = 1;
    masterGain.connect(ctx.destination);
  }

  // create global controller
  var HowlerGlobal = function(codecs) {
    this._volume = 1;
    this._muted = false;
    this.usingWebAudio = usingWebAudio;
    this.ctx = ctx;
    this.noAudio = noAudio;
    this._howls = [];
    this._codecs = codecs;
    this.iOSAutoEnable = true;
  };
  HowlerGlobal.prototype = {
    /**
     * Get/set the global volume for all sounds.
     * @param  {Float} vol Volume from 0.0 to 1.0.
     * @return {Howler/Float}     Returns self or current volume.
     */
    volume: function(vol) {
      var self = this;

      // make sure volume is a number
      vol = parseFloat(vol);

      if (vol >= 0 && vol <= 1) {
        self._volume = vol;

        if (usingWebAudio) {
          masterGain.gain.value = vol;
        }

        // loop through cache and change volume of all nodes that are using HTML5 Audio
        for (var key in self._howls) {
          if (self._howls.hasOwnProperty(key) && self._howls[key]._webAudio === false) {
            // loop through the audio nodes
            for (var i=0; i<self._howls[key]._audioNode.length; i++) {
              self._howls[key]._audioNode[i].volume = self._howls[key]._volume * self._volume;
            }
          }
        }

        return self;
      }

      // return the current global volume
      return (usingWebAudio) ? masterGain.gain.value : self._volume;
    },

    /**
     * Mute all sounds.
     * @return {Howler}
     */
    mute: function() {
      this._setMuted(true);

      return this;
    },

    /**
     * Unmute all sounds.
     * @return {Howler}
     */
    unmute: function() {
      this._setMuted(false);

      return this;
    },

    /**
     * Handle muting and unmuting globally.
     * @param  {Boolean} muted Is muted or not.
     */
    _setMuted: function(muted) {
      var self = this;

      self._muted = muted;

      if (usingWebAudio) {
        masterGain.gain.value = muted ? 0 : self._volume;
      }

      for (var key in self._howls) {
        if (self._howls.hasOwnProperty(key) && self._howls[key]._webAudio === false) {
          // loop through the audio nodes
          for (var i=0; i<self._howls[key]._audioNode.length; i++) {
            self._howls[key]._audioNode[i].muted = muted;
          }
        }
      }
    },

    /**
     * Check for codec support.
     * @param  {String} ext Audio file extention.
     * @return {Boolean}
     */
    codecs: function(ext) {
      return this._codecs[ext];
    },

    /**
     * iOS will only allow audio to be played after a user interaction.
     * Attempt to automatically unlock audio on the first user interaction.
     * Concept from: http://paulbakaus.com/tutorials/html5/web-audio-on-ios/
     * @return {Howler}
     */
    _enableiOSAudio: function() {
      var self = this;

      // only run this on iOS if audio isn't already eanbled
      if (ctx && (self._iOSEnabled || !/iPhone|iPad|iPod/i.test(navigator.userAgent))) {
        return;
      }

      self._iOSEnabled = false;

      // call this method on touch start to create and play a buffer,
      // then check if the audio actually played to determine if
      // audio has now been unlocked on iOS
      var unlock = function() {
        // create an empty buffer
        var buffer = ctx.createBuffer(1, 1, 22050);
        var source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);

        // play the empty buffer
        if (typeof source.start === 'undefined') {
          source.noteOn(0);
        } else {
          source.start(0);
        }

        // setup a timeout to check that we are unlocked on the next event loop
        setTimeout(function() {
          if ((source.playbackState === source.PLAYING_STATE || source.playbackState === source.FINISHED_STATE)) {
            // update the unlocked state and prevent this check from happening again
            self._iOSEnabled = true;
            self.iOSAutoEnable = false;

            // remove the touch start listener
            window.removeEventListener('touchend', unlock, false);
          }
        }, 0);
      };

      // setup a touch start listener to attempt an unlock in
      window.addEventListener('touchend', unlock, false);

      return self;
    }
  };

  // check for browser codec support
  var audioTest = null;
  var codecs = {};
  if (!noAudio) {
    audioTest = new Audio();
    codecs = {
      mp3: !!audioTest.canPlayType('audio/mpeg;').replace(/^no$/, ''),
      opus: !!audioTest.canPlayType('audio/ogg; codecs="opus"').replace(/^no$/, ''),
      ogg: !!audioTest.canPlayType('audio/ogg; codecs="vorbis"').replace(/^no$/, ''),
      wav: !!audioTest.canPlayType('audio/wav; codecs="1"').replace(/^no$/, ''),
      aac: !!audioTest.canPlayType('audio/aac;').replace(/^no$/, ''),
      m4a: !!(audioTest.canPlayType('audio/x-m4a;') || audioTest.canPlayType('audio/m4a;') || audioTest.canPlayType('audio/aac;')).replace(/^no$/, ''),
      mp4: !!(audioTest.canPlayType('audio/x-mp4;') || audioTest.canPlayType('audio/mp4;') || audioTest.canPlayType('audio/aac;')).replace(/^no$/, ''),
      weba: !!audioTest.canPlayType('audio/webm; codecs="vorbis"').replace(/^no$/, '')
    };
  }

  // allow access to the global audio controls
  var Howler = new HowlerGlobal(codecs);

  // setup the audio object
  var Howl = function(o) {
    var self = this;

    // setup the defaults
    self._autoplay = o.autoplay || false;
    self._buffer = o.buffer || false;
    self._duration = o.duration || 0;
    self._format = o.format || null;
    self._loop = o.loop || false;
    self._loaded = false;
    self._sprite = o.sprite || {};
    self._src = o.src || '';
    self._pos3d = o.pos3d || [0, 0, -0.5];
    self._volume = o.volume !== undefined ? o.volume : 1;
    self._urls = o.urls || [];
    self._rate = o.rate || 1;

    // allow forcing of a specific panningModel ('equalpower' or 'HRTF'),
    // if none is specified, defaults to 'equalpower' and switches to 'HRTF'
    // if 3d sound is used
    self._model = o.model || null;

    // setup event functions
    self._onload = [o.onload || function() {}];
    self._onloaderror = [o.onloaderror || function() {}];
    self._onend = [o.onend || function() {}];
    self._onpause = [o.onpause || function() {}];
    self._onplay = [o.onplay || function() {}];

    self._onendTimer = [];

    // Web Audio or HTML5 Audio?
    self._webAudio = usingWebAudio && !self._buffer;

    // check if we need to fall back to HTML5 Audio
    self._audioNode = [];
    if (self._webAudio) {
      self._setupAudioNode();
    }

    // automatically try to enable audio on iOS
    if (typeof ctx !== 'undefined' && ctx && Howler.iOSAutoEnable) {
      Howler._enableiOSAudio();
    }

    // add this to an array of Howl's to allow global control
    Howler._howls.push(self);

    // load the track
    self.load();
  };

  // setup all of the methods
  Howl.prototype = {
    /**
     * Load an audio file.
     * @return {Howl}
     */
    load: function() {
      var self = this,
        url = null;

      // if no audio is available, quit immediately
      if (noAudio) {
        self.on('loaderror');
        return;
      }

      // loop through source URLs and pick the first one that is compatible
      for (var i=0; i<self._urls.length; i++) {
        var ext, urlItem;

        if (self._format) {
          // use specified audio format if available
          ext = self._format;
        } else {
          // figure out the filetype (whether an extension or base64 data)
          urlItem = self._urls[i];
          ext = /^data:audio\/([^;,]+);/i.exec(urlItem);
          if (!ext) {
            ext = /\.([^.]+)$/.exec(urlItem.split('?', 1)[0]);
          }

          if (ext) {
            ext = ext[1].toLowerCase();
          } else {
            self.on('loaderror');
            return;
          }
        }

        if (codecs[ext]) {
          url = self._urls[i];
          break;
        }
      }

      if (!url) {
        self.on('loaderror');
        return;
      }

      self._src = url;

      if (self._webAudio) {
        loadBuffer(self, url);
      } else {
        var newNode = new Audio();

        // listen for errors with HTML5 audio (http://dev.w3.org/html5/spec-author-view/spec.html#mediaerror)
        newNode.addEventListener('error', function () {
          if (newNode.error && newNode.error.code === 4) {
            HowlerGlobal.noAudio = true;
          }

          self.on('loaderror', {type: newNode.error ? newNode.error.code : 0});
        }, false);

        self._audioNode.push(newNode);

        // setup the new audio node
        newNode.src = url;
        newNode._pos = 0;
        newNode.preload = 'auto';
        newNode.volume = (Howler._muted) ? 0 : self._volume * Howler.volume();

        // setup the event listener to start playing the sound
        // as soon as it has buffered enough
        var listener = function() {
          // round up the duration when using HTML5 Audio to account for the lower precision
          self._duration = Math.ceil(newNode.duration * 10) / 10;

          // setup a sprite if none is defined
          if (Object.getOwnPropertyNames(self._sprite).length === 0) {
            self._sprite = {_default: [0, self._duration * 1000]};
          }

          if (!self._loaded) {
            self._loaded = true;
            self.on('load');
          }

          if (self._autoplay) {
            self.play();
          }

          // clear the event listener
          newNode.removeEventListener('canplaythrough', listener, false);
        };
        newNode.addEventListener('canplaythrough', listener, false);
        newNode.load();
      }

      return self;
    },

    /**
     * Get/set the URLs to be pulled from to play in this source.
     * @param  {Array} urls  Arry of URLs to load from
     * @return {Howl}        Returns self or the current URLs
     */
    urls: function(urls) {
      var self = this;

      if (urls) {
        self.stop();
        self._urls = (typeof urls === 'string') ? [urls] : urls;
        self._loaded = false;
        self.load();

        return self;
      } else {
        return self._urls;
      }
    },

    /**
     * Play a sound from the current time (0 by default).
     * @param  {String}   sprite   (optional) Plays from the specified position in the sound sprite definition.
     * @param  {Function} callback (optional) Returns the unique playback id for this sound instance.
     * @return {Howl}
     */
    play: function(sprite, callback) {
      var self = this;

      // if no sprite was passed but a callback was, update the variables
      if (typeof sprite === 'function') {
        callback = sprite;
      }

      // use the default sprite if none is passed
      if (!sprite || typeof sprite === 'function') {
        sprite = '_default';
      }

      // if the sound hasn't been loaded, add it to the event queue
      if (!self._loaded) {
        self.on('load', function() {
          self.play(sprite, callback);
        });

        return self;
      }

      // if the sprite doesn't exist, play nothing
      if (!self._sprite[sprite]) {
        if (typeof callback === 'function') callback();
        return self;
      }

      // get the node to playback
      self._inactiveNode(function(node) {
        // persist the sprite being played
        node._sprite = sprite;

        // determine where to start playing from
        var pos = (node._pos > 0) ? node._pos : self._sprite[sprite][0] / 1000;

        // determine how long to play for
        var duration = 0;
        if (self._webAudio) {
          duration = self._sprite[sprite][1] / 1000 - node._pos;
          if (node._pos > 0) {
            pos = self._sprite[sprite][0] / 1000 + pos;
          }
        } else {
          duration = self._sprite[sprite][1] / 1000 - (pos - self._sprite[sprite][0] / 1000);
        }

        // determine if this sound should be looped
        var loop = !!(self._loop || self._sprite[sprite][2]);

        // set timer to fire the 'onend' event
        var soundId = (typeof callback === 'string') ? callback : Math.round(Date.now() * Math.random()) + '',
          timerId;
        (function() {
          var data = {
            id: soundId,
            sprite: sprite,
            loop: loop
          };
          timerId = setTimeout(function() {
            // if looping, restart the track
            if (!self._webAudio && loop) {
              self.stop(data.id).play(sprite, data.id);
            }

            // set web audio node to paused at end
            if (self._webAudio && !loop) {
              self._nodeById(data.id).paused = true;
              self._nodeById(data.id)._pos = 0;

              // clear the end timer
              self._clearEndTimer(data.id);
            }

            // end the track if it is HTML audio and a sprite
            if (!self._webAudio && !loop) {
              self.stop(data.id);
            }

            // fire ended event
            self.on('end', soundId);
          }, duration * 1000);

          // store the reference to the timer
          self._onendTimer.push({timer: timerId, id: data.id});
        })();

        if (self._webAudio) {
          var loopStart = self._sprite[sprite][0] / 1000,
            loopEnd = self._sprite[sprite][1] / 1000;

          // set the play id to this node and load into context
          node.id = soundId;
          node.paused = false;
          refreshBuffer(self, [loop, loopStart, loopEnd], soundId);
          self._playStart = ctx.currentTime;
          node.gain.value = self._volume;

          if (typeof node.bufferSource.start === 'undefined') {
            loop ? node.bufferSource.noteGrainOn(0, pos, 86400) : node.bufferSource.noteGrainOn(0, pos, duration);
          } else {
            loop ? node.bufferSource.start(0, pos, 86400) : node.bufferSource.start(0, pos, duration);
          }
        } else {
          if (node.readyState === 4 || !node.readyState && navigator.isCocoonJS) {
            node.readyState = 4;
            node.id = soundId;
            node.currentTime = pos;
            node.muted = Howler._muted || node.muted;
            node.volume = self._volume * Howler.volume();
            setTimeout(function() { node.play(); }, 0);
          } else {
            self._clearEndTimer(soundId);

            (function(){
              var sound = self,
                playSprite = sprite,
                fn = callback,
                newNode = node;
              var listener = function() {
                sound.play(playSprite, fn);

                // clear the event listener
                newNode.removeEventListener('canplaythrough', listener, false);
              };
              newNode.addEventListener('canplaythrough', listener, false);
            })();

            return self;
          }
        }

        // fire the play event and send the soundId back in the callback
        self.on('play');
        if (typeof callback === 'function') callback(soundId);

        return self;
      });

      return self;
    },

    /**
     * Pause playback and save the current position.
     * @param {String} id (optional) The play instance ID.
     * @return {Howl}
     */
    pause: function(id) {
      var self = this;

      // if the sound hasn't been loaded, add it to the event queue
      if (!self._loaded) {
        self.on('play', function() {
          self.pause(id);
        });

        return self;
      }

      // clear 'onend' timer
      self._clearEndTimer(id);

      var activeNode = (id) ? self._nodeById(id) : self._activeNode();
      if (activeNode) {
        activeNode._pos = self.pos(null, id);

        if (self._webAudio) {
          // make sure the sound has been created
          if (!activeNode.bufferSource || activeNode.paused) {
            return self;
          }

          activeNode.paused = true;
          if (typeof activeNode.bufferSource.stop === 'undefined') {
            activeNode.bufferSource.noteOff(0);
          } else {
            activeNode.bufferSource.stop(0);
          }
        } else {
          activeNode.pause();
        }
      }

      self.on('pause');

      return self;
    },

    /**
     * Stop playback and reset to start.
     * @param  {String} id  (optional) The play instance ID.
     * @return {Howl}
     */
    stop: function(id) {
      var self = this;

      // if the sound hasn't been loaded, add it to the event queue
      if (!self._loaded) {
        self.on('play', function() {
          self.stop(id);
        });

        return self;
      }

      // clear 'onend' timer
      self._clearEndTimer(id);

      var activeNode = (id) ? self._nodeById(id) : self._activeNode();
      if (activeNode) {
        activeNode._pos = 0;

        if (self._webAudio) {
          // make sure the sound has been created
          if (!activeNode.bufferSource || activeNode.paused) {
            return self;
          }

          activeNode.paused = true;

          if (typeof activeNode.bufferSource.stop === 'undefined') {
            activeNode.bufferSource.noteOff(0);
          } else {
            activeNode.bufferSource.stop(0);
          }
        } else if (!isNaN(activeNode.duration)) {
          activeNode.pause();
          activeNode.currentTime = 0;
        }
      }

      return self;
    },

    /**
     * Mute this sound.
     * @param  {String} id (optional) The play instance ID.
     * @return {Howl}
     */
    mute: function(id) {
      var self = this;

      // if the sound hasn't been loaded, add it to the event queue
      if (!self._loaded) {
        self.on('play', function() {
          self.mute(id);
        });

        return self;
      }

      var activeNode = (id) ? self._nodeById(id) : self._activeNode();
      if (activeNode) {
        if (self._webAudio) {
          activeNode.gain.value = 0;
        } else {
          activeNode.muted = true;
        }
      }

      return self;
    },

    /**
     * Unmute this sound.
     * @param  {String} id (optional) The play instance ID.
     * @return {Howl}
     */
    unmute: function(id) {
      var self = this;

      // if the sound hasn't been loaded, add it to the event queue
      if (!self._loaded) {
        self.on('play', function() {
          self.unmute(id);
        });

        return self;
      }

      var activeNode = (id) ? self._nodeById(id) : self._activeNode();
      if (activeNode) {
        if (self._webAudio) {
          activeNode.gain.value = self._volume;
        } else {
          activeNode.muted = false;
        }
      }

      return self;
    },

    /**
     * Get/set volume of this sound.
     * @param  {Float}  vol Volume from 0.0 to 1.0.
     * @param  {String} id  (optional) The play instance ID.
     * @return {Howl/Float}     Returns self or current volume.
     */
    volume: function(vol, id) {
      var self = this;

      // make sure volume is a number
      vol = parseFloat(vol);

      if (vol >= 0 && vol <= 1) {
        self._volume = vol;

        // if the sound hasn't been loaded, add it to the event queue
        if (!self._loaded) {
          self.on('play', function() {
            self.volume(vol, id);
          });

          return self;
        }

        var activeNode = (id) ? self._nodeById(id) : self._activeNode();
        if (activeNode) {
          if (self._webAudio) {
            activeNode.gain.value = vol;
          } else {
            activeNode.volume = vol * Howler.volume();
          }
        }

        return self;
      } else {
        return self._volume;
      }
    },

    /**
     * Get/set whether to loop the sound.
     * @param  {Boolean} loop To loop or not to loop, that is the question.
     * @return {Howl/Boolean}      Returns self or current looping value.
     */
    loop: function(loop) {
      var self = this;

      if (typeof loop === 'boolean') {
        self._loop = loop;

        return self;
      } else {
        return self._loop;
      }
    },

    /**
     * Get/set sound sprite definition.
     * @param  {Object} sprite Example: {spriteName: [offset, duration, loop]}
     *                @param {Integer} offset   Where to begin playback in milliseconds
     *                @param {Integer} duration How long to play in milliseconds
     *                @param {Boolean} loop     (optional) Set true to loop this sprite
     * @return {Howl}        Returns current sprite sheet or self.
     */
    sprite: function(sprite) {
      var self = this;

      if (typeof sprite === 'object') {
        self._sprite = sprite;

        return self;
      } else {
        return self._sprite;
      }
    },

    /**
     * Get/set the position of playback.
     * @param  {Float}  pos The position to move current playback to.
     * @param  {String} id  (optional) The play instance ID.
     * @return {Howl/Float}      Returns self or current playback position.
     */
    pos: function(pos, id) {
      var self = this;

      // if the sound hasn't been loaded, add it to the event queue
      if (!self._loaded) {
        self.on('load', function() {
          self.pos(pos);
        });

        return typeof pos === 'number' ? self : self._pos || 0;
      }

      // make sure we are dealing with a number for pos
      pos = parseFloat(pos);

      var activeNode = (id) ? self._nodeById(id) : self._activeNode();
      if (activeNode) {
        if (pos >= 0) {
          self.pause(id);
          activeNode._pos = pos;
          self.play(activeNode._sprite, id);

          return self;
        } else {
          return self._webAudio ? activeNode._pos + (ctx.currentTime - self._playStart) : activeNode.currentTime;
        }
      } else if (pos >= 0) {
        return self;
      } else {
        // find the first inactive node to return the pos for
        for (var i=0; i<self._audioNode.length; i++) {
          if (self._audioNode[i].paused && self._audioNode[i].readyState === 4) {
            return (self._webAudio) ? self._audioNode[i]._pos : self._audioNode[i].currentTime;
          }
        }
      }
    },

    /**
     * Get/set the 3D position of the audio source.
     * The most common usage is to set the 'x' position
     * to affect the left/right ear panning. Setting any value higher than
     * 1.0 will begin to decrease the volume of the sound as it moves further away.
     * NOTE: This only works with Web Audio API, HTML5 Audio playback
     * will not be affected.
     * @param  {Float}  x  The x-position of the playback from -1000.0 to 1000.0
     * @param  {Float}  y  The y-position of the playback from -1000.0 to 1000.0
     * @param  {Float}  z  The z-position of the playback from -1000.0 to 1000.0
     * @param  {String} id (optional) The play instance ID.
     * @return {Howl/Array}   Returns self or the current 3D position: [x, y, z]
     */
    pos3d: function(x, y, z, id) {
      var self = this;

      // set a default for the optional 'y' & 'z'
      y = (typeof y === 'undefined' || !y) ? 0 : y;
      z = (typeof z === 'undefined' || !z) ? -0.5 : z;

      // if the sound hasn't been loaded, add it to the event queue
      if (!self._loaded) {
        self.on('play', function() {
          self.pos3d(x, y, z, id);
        });

        return self;
      }

      if (x >= 0 || x < 0) {
        if (self._webAudio) {
          var activeNode = (id) ? self._nodeById(id) : self._activeNode();
          if (activeNode) {
            self._pos3d = [x, y, z];
            activeNode.panner.setPosition(x, y, z);
            activeNode.panner.panningModel = self._model || 'HRTF';
          }
        }
      } else {
        return self._pos3d;
      }

      return self;
    },

    /**
     * Fade a currently playing sound between two volumes.
     * @param  {Number}   from     The volume to fade from (0.0 to 1.0).
     * @param  {Number}   to       The volume to fade to (0.0 to 1.0).
     * @param  {Number}   len      Time in milliseconds to fade.
     * @param  {Function} callback (optional) Fired when the fade is complete.
     * @param  {String}   id       (optional) The play instance ID.
     * @return {Howl}
     */
    fade: function(from, to, len, callback, id) {
      var self = this,
        diff = Math.abs(from - to),
        dir = from > to ? 'down' : 'up',
        steps = diff / 0.01,
        stepTime = len / steps;

      // if the sound hasn't been loaded, add it to the event queue
      if (!self._loaded) {
        self.on('load', function() {
          self.fade(from, to, len, callback, id);
        });

        return self;
      }

      // set the volume to the start position
      self.volume(from, id);

      for (var i=1; i<=steps; i++) {
        (function() {
          var change = self._volume + (dir === 'up' ? 0.01 : -0.01) * i,
            vol = Math.round(1000 * change) / 1000,
            toVol = to;

          setTimeout(function() {
            self.volume(vol, id);

            if (vol === toVol) {
              if (callback) callback();
            }
          }, stepTime * i);
        })();
      }
    },

    /**
     * [DEPRECATED] Fade in the current sound.
     * @param  {Float}    to      Volume to fade to (0.0 to 1.0).
     * @param  {Number}   len     Time in milliseconds to fade.
     * @param  {Function} callback
     * @return {Howl}
     */
    fadeIn: function(to, len, callback) {
      return this.volume(0).play().fade(0, to, len, callback);
    },

    /**
     * [DEPRECATED] Fade out the current sound and pause when finished.
     * @param  {Float}    to       Volume to fade to (0.0 to 1.0).
     * @param  {Number}   len      Time in milliseconds to fade.
     * @param  {Function} callback
     * @param  {String}   id       (optional) The play instance ID.
     * @return {Howl}
     */
    fadeOut: function(to, len, callback, id) {
      var self = this;

      return self.fade(self._volume, to, len, function() {
        if (callback) callback();
        self.pause(id);

        // fire ended event
        self.on('end');
      }, id);
    },

    /**
     * Get an audio node by ID.
     * @return {Howl} Audio node.
     */
    _nodeById: function(id) {
      var self = this,
        node = self._audioNode[0];

      // find the node with this ID
      for (var i=0; i<self._audioNode.length; i++) {
        if (self._audioNode[i].id === id) {
          node = self._audioNode[i];
          break;
        }
      }

      return node;
    },

    /**
     * Get the first active audio node.
     * @return {Howl} Audio node.
     */
    _activeNode: function() {
      var self = this,
        node = null;

      // find the first playing node
      for (var i=0; i<self._audioNode.length; i++) {
        if (!self._audioNode[i].paused) {
          node = self._audioNode[i];
          break;
        }
      }

      // remove excess inactive nodes
      self._drainPool();

      return node;
    },

    /**
     * Get the first inactive audio node.
     * If there is none, create a new one and add it to the pool.
     * @param  {Function} callback Function to call when the audio node is ready.
     */
    _inactiveNode: function(callback) {
      var self = this,
        node = null;

      // find first inactive node to recycle
      for (var i=0; i<self._audioNode.length; i++) {
        if (self._audioNode[i].paused && self._audioNode[i].readyState === 4) {
          // send the node back for use by the new play instance
          callback(self._audioNode[i]);
          node = true;
          break;
        }
      }

      // remove excess inactive nodes
      self._drainPool();

      if (node) {
        return;
      }

      // create new node if there are no inactives
      var newNode;
      if (self._webAudio) {
        newNode = self._setupAudioNode();
        callback(newNode);
      } else {
        self.load();
        newNode = self._audioNode[self._audioNode.length - 1];

        // listen for the correct load event and fire the callback
        var listenerEvent = navigator.isCocoonJS ? 'canplaythrough' : 'loadedmetadata';
        var listener = function() {
          newNode.removeEventListener(listenerEvent, listener, false);
          callback(newNode);
        };
        newNode.addEventListener(listenerEvent, listener, false);
      }
    },

    /**
     * If there are more than 5 inactive audio nodes in the pool, clear out the rest.
     */
    _drainPool: function() {
      var self = this,
        inactive = 0,
        i;

      // count the number of inactive nodes
      for (i=0; i<self._audioNode.length; i++) {
        if (self._audioNode[i].paused) {
          inactive++;
        }
      }

      // remove excess inactive nodes
      for (i=self._audioNode.length-1; i>=0; i--) {
        if (inactive <= 5) {
          break;
        }

        if (self._audioNode[i].paused) {
          // disconnect the audio source if using Web Audio
          if (self._webAudio) {
            self._audioNode[i].disconnect(0);
          }

          inactive--;
          self._audioNode.splice(i, 1);
        }
      }
    },

    /**
     * Clear 'onend' timeout before it ends.
     * @param  {String} soundId  The play instance ID.
     */
    _clearEndTimer: function(soundId) {
      var self = this,
        index = 0;

      // loop through the timers to find the one associated with this sound
      for (var i=0; i<self._onendTimer.length; i++) {
        if (self._onendTimer[i].id === soundId) {
          index = i;
          break;
        }
      }

      var timer = self._onendTimer[index];
      if (timer) {
        clearTimeout(timer.timer);
        self._onendTimer.splice(index, 1);
      }
    },

    /**
     * Setup the gain node and panner for a Web Audio instance.
     * @return {Object} The new audio node.
     */
    _setupAudioNode: function() {
      var self = this,
        node = self._audioNode,
        index = self._audioNode.length;

      // create gain node
      node[index] = (typeof ctx.createGain === 'undefined') ? ctx.createGainNode() : ctx.createGain();
      node[index].gain.value = self._volume;
      node[index].paused = true;
      node[index]._pos = 0;
      node[index].readyState = 4;
      node[index].connect(masterGain);

      // create the panner
      node[index].panner = ctx.createPanner();
      node[index].panner.panningModel = self._model || 'equalpower';
      node[index].panner.setPosition(self._pos3d[0], self._pos3d[1], self._pos3d[2]);
      node[index].panner.connect(node[index]);

      return node[index];
    },

    /**
     * Call/set custom events.
     * @param  {String}   event Event type.
     * @param  {Function} fn    Function to call.
     * @return {Howl}
     */
    on: function(event, fn) {
      var self = this,
        events = self['_on' + event];

      if (typeof fn === 'function') {
        events.push(fn);
      } else {
        for (var i=0; i<events.length; i++) {
          if (fn) {
            events[i].call(self, fn);
          } else {
            events[i].call(self);
          }
        }
      }

      return self;
    },

    /**
     * Remove a custom event.
     * @param  {String}   event Event type.
     * @param  {Function} fn    Listener to remove.
     * @return {Howl}
     */
    off: function(event, fn) {
      var self = this,
        events = self['_on' + event],
        fnString = fn ? fn.toString() : null;

      if (fnString) {
        // loop through functions in the event for comparison
        for (var i=0; i<events.length; i++) {
          if (fnString === events[i].toString()) {
            events.splice(i, 1);
            break;
          }
        }
      } else {
        self['_on' + event] = [];
      }

      return self;
    },

    /**
     * Unload and destroy the current Howl object.
     * This will immediately stop all play instances attached to this sound.
     */
    unload: function() {
      var self = this;

      // stop playing any active nodes
      var nodes = self._audioNode;
      for (var i=0; i<self._audioNode.length; i++) {
        // stop the sound if it is currently playing
        if (!nodes[i].paused) {
          self.stop(nodes[i].id);
          self.on('end', nodes[i].id);
        }

        if (!self._webAudio) {
          // remove the source if using HTML5 Audio
          nodes[i].src = '';
        } else {
          // disconnect the output from the master gain
          nodes[i].disconnect(0);
        }
      }

      // make sure all timeouts are cleared
      for (i=0; i<self._onendTimer.length; i++) {
        clearTimeout(self._onendTimer[i].timer);
      }

      // remove the reference in the global Howler object
      var index = Howler._howls.indexOf(self);
      if (index !== null && index >= 0) {
        Howler._howls.splice(index, 1);
      }

      // delete this sound from the cache
      delete cache[self._src];
      self = null;
    }

  };

  // only define these functions when using WebAudio
  if (usingWebAudio) {

    /**
     * Buffer a sound from URL (or from cache) and decode to audio source (Web Audio API).
     * @param  {Object} obj The Howl object for the sound to load.
     * @param  {String} url The path to the sound file.
     */
    var loadBuffer = function(obj, url) {
      // check if the buffer has already been cached
      if (url in cache) {
        // set the duration from the cache
        obj._duration = cache[url].duration;

        // load the sound into this object
        loadSound(obj);
        return;
      }
      
      if (/^data:[^;]+;base64,/.test(url)) {
        // Decode base64 data-URIs because some browsers cannot load data-URIs with XMLHttpRequest.
        var data = atob(url.split(',')[1]);
        var dataView = new Uint8Array(data.length);
        for (var i=0; i<data.length; ++i) {
          dataView[i] = data.charCodeAt(i);
        }
        
        decodeAudioData(dataView.buffer, obj, url);
      } else {
        // load the buffer from the URL
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.responseType = 'arraybuffer';
        xhr.onload = function() {
          decodeAudioData(xhr.response, obj, url);
        };
        xhr.onerror = function() {
          // if there is an error, switch the sound to HTML Audio
          if (obj._webAudio) {
            obj._buffer = true;
            obj._webAudio = false;
            obj._audioNode = [];
            delete obj._gainNode;
            delete cache[url];
            obj.load();
          }
        };
        try {
          xhr.send();
        } catch (e) {
          xhr.onerror();
        }
      }
    };

    /**
     * Decode audio data from an array buffer.
     * @param  {ArrayBuffer} arraybuffer The audio data.
     * @param  {Object} obj The Howl object for the sound to load.
     * @param  {String} url The path to the sound file.
     */
    var decodeAudioData = function(arraybuffer, obj, url) {
      // decode the buffer into an audio source
      ctx.decodeAudioData(
        arraybuffer,
        function(buffer) {
          if (buffer) {
            cache[url] = buffer;
            loadSound(obj, buffer);
          }
        },
        function(err) {
          obj.on('loaderror');
        }
      );
    };

    /**
     * Finishes loading the Web Audio API sound and fires the loaded event
     * @param  {Object}  obj    The Howl object for the sound to load.
     * @param  {Objecct} buffer The decoded buffer sound source.
     */
    var loadSound = function(obj, buffer) {
      // set the duration
      obj._duration = (buffer) ? buffer.duration : obj._duration;

      // setup a sprite if none is defined
      if (Object.getOwnPropertyNames(obj._sprite).length === 0) {
        obj._sprite = {_default: [0, obj._duration * 1000]};
      }

      // fire the loaded event
      if (!obj._loaded) {
        obj._loaded = true;
        obj.on('load');
      }

      if (obj._autoplay) {
        obj.play();
      }
    };

    /**
     * Load the sound back into the buffer source.
     * @param  {Object} obj   The sound to load.
     * @param  {Array}  loop  Loop boolean, pos, and duration.
     * @param  {String} id    (optional) The play instance ID.
     */
    var refreshBuffer = function(obj, loop, id) {
      // determine which node to connect to
      var node = obj._nodeById(id);

      // setup the buffer source for playback
      node.bufferSource = ctx.createBufferSource();
      node.bufferSource.buffer = cache[obj._src];
      node.bufferSource.connect(node.panner);
      node.bufferSource.loop = loop[0];
      if (loop[0]) {
        node.bufferSource.loopStart = loop[1];
        node.bufferSource.loopEnd = loop[1] + loop[2];
      }
      node.bufferSource.playbackRate.value = obj._rate;
    };

  }

  /**
   * Add support for AMD (Asynchronous Module Definition) libraries such as require.js.
   */
  if (typeof define === 'function' && define.amd) {
    define(function() {
      return {
        Howler: Howler,
        Howl: Howl
      };
    });
  }

  /**
   * Add support for CommonJS libraries such as browserify.
   */
  if (typeof exports !== 'undefined') {
    exports.Howler = Howler;
    exports.Howl = Howl;
  }

  // define globally in case AMD is not available or available but not used

  if (typeof window !== 'undefined') {
    window.Howler = Howler;
    window.Howl = Howl;
  }

})();

},{}],18:[function(require,module,exports){
/* global requestAnimationFrame */

var eases = require("eases");

if (typeof requestAnimationFrame === "undefined") {
    var requestAnimationFrame = function (fn) {
        setTimeout(fn, 1000 / 60);
    }
}

function transformation (from, to, callback, args, after) {
    
    var dur, easing, cv, diff, c, lastExecution, fps;
    var canceled, paused, running, stopped;
    var timeElapsed, startTime, pauseTimeElapsed, pauseStartTime;
    
    args = args || {};
    
    if (typeof args === "function" && !after) {
        after = args;
        args = {};
    }
    
    after = typeof after === "function" ? after : function () {};
    
    if (typeof callback === "undefined" || !callback) {
        throw new Error("Argument callback must be a function.");
    }
    
    init();
    
    function init () {
        
        dur = typeof args.duration !== "undefined" && args.duration >= 0 ? args.duration : 500;
        cv = from;
        diff = to - from;
        c = 0, // number of times loop get's executed
        lastExecution = 0;
        fps = args.fps || 60;
        canceled = false;
        paused = false;
        running = false;
        stopped = false;
        timeElapsed = 0;
        startTime = 0;
        pauseTimeElapsed = 0;
        pauseStartTime = 0;
        easing = eases.linear;
        
        if (args.easing) {
            if (typeof args.easing === "function") {
                easing = args.easing;
            }
            else {
                easing = eases[args.easing];
            }
        }
    }
    
    function loop () {
        
        var dt, tElapsed;
        
        if (!running) {
            return;
        }
        
        if ((Date.now() - lastExecution) > (1000 / fps)) {
            
            if (canceled || paused) {
                return;
            }
            
            c += 1;
            tElapsed = elapsed();
            
            if (tElapsed > dur || stopped) {
                
                cv = from + diff;
                
                if (!stopped) {
                    stop();
                }
                
                return;
            }
            
            cv = easing(tElapsed / dur) * diff + from;
            
            callback(cv);
            
            dt = elapsed() - tElapsed;
            
            lastExecution = Date.now();
        }
        
        requestAnimationFrame(loop);
    };
    
    function elapsed () {
        
        if (running && !paused) {
            timeElapsed = ((+(new Date()) - startTime) - pauseTimeElapsed);
        }
        
        return timeElapsed;
    }
    
    function start () {
        
        reset();
        
        startTime = +(new Date());
        pauseStartTime = startTime;
        running = true;
        
        requestAnimationFrame(loop);
    }
    
    function stop () {
        
        running = false;
        paused = false;
        
        callback(to);
        after();
    }
    
    function resume () {
        
        if (!paused) {
            return;
        }
        
        paused = false;
        pauseTimeElapsed += +(new Date()) - pauseStartTime;
        
        requestAnimationFrame(loop);
    }
    
    function pause () {
        paused = true;
        pauseStartTime = +(new Date());
    }
    
    function cancel () {
        
        if (!running) {
            return;
        }
        
        elapsed();
        
        canceled = true;
        running = false;
        paused = false;
        
        after();
    }
    
    function reset () {
        
        if (running) {
            cancel();
        }
        
        init();
    }
    
    return {
        start: start,
        stop: stop,
        pause: pause,
        resume: resume,
        cancel: cancel,
        elapsed: elapsed,
        reset: reset
    };
}

function transform () {
    
    var t = transformation.apply(undefined, arguments);
    
    t.start();
    
    return t;
}

module.exports = {
    transformation: transformation,
    transform: transform
};

},{"eases":37}],19:[function(require,module,exports){
function backInOut(t) {
  var s = 1.70158 * 1.525
  if ((t *= 2) < 1)
    return 0.5 * (t * t * ((s + 1) * t - s))
  return 0.5 * ((t -= 2) * t * ((s + 1) * t + s) + 2)
}

module.exports = backInOut
},{}],20:[function(require,module,exports){
function backIn(t) {
  var s = 1.70158
  return t * t * ((s + 1) * t - s)
}

module.exports = backIn
},{}],21:[function(require,module,exports){
function backOut(t) {
  var s = 1.70158
  return --t * t * ((s + 1) * t + s) + 1
}

module.exports = backOut
},{}],22:[function(require,module,exports){
var bounceOut = require('./bounce-out')

function bounceInOut(t) {
  return t < 0.5
    ? 0.5 * (1.0 - bounceOut(1.0 - t * 2.0))
    : 0.5 * bounceOut(t * 2.0 - 1.0) + 0.5
}

module.exports = bounceInOut
},{"./bounce-out":24}],23:[function(require,module,exports){
var bounceOut = require('./bounce-out')

function bounceIn(t) {
  return 1.0 - bounceOut(1.0 - t)
}

module.exports = bounceIn
},{"./bounce-out":24}],24:[function(require,module,exports){
function bounceOut(t) {
  var a = 4.0 / 11.0
  var b = 8.0 / 11.0
  var c = 9.0 / 10.0

  var ca = 4356.0 / 361.0
  var cb = 35442.0 / 1805.0
  var cc = 16061.0 / 1805.0

  var t2 = t * t

  return t < a
    ? 7.5625 * t2
    : t < b
      ? 9.075 * t2 - 9.9 * t + 3.4
      : t < c
        ? ca * t2 - cb * t + cc
        : 10.8 * t * t - 20.52 * t + 10.72
}

module.exports = bounceOut
},{}],25:[function(require,module,exports){
function circInOut(t) {
  if ((t *= 2) < 1) return -0.5 * (Math.sqrt(1 - t * t) - 1)
  return 0.5 * (Math.sqrt(1 - (t -= 2) * t) + 1)
}

module.exports = circInOut
},{}],26:[function(require,module,exports){
function circIn(t) {
  return 1.0 - Math.sqrt(1.0 - t * t)
}

module.exports = circIn
},{}],27:[function(require,module,exports){
function circOut(t) {
  return Math.sqrt(1 - ( --t * t ))
}

module.exports = circOut
},{}],28:[function(require,module,exports){
function cubicInOut(t) {
  return t < 0.5
    ? 4.0 * t * t * t
    : 0.5 * Math.pow(2.0 * t - 2.0, 3.0) + 1.0
}

module.exports = cubicInOut
},{}],29:[function(require,module,exports){
function cubicIn(t) {
  return t * t * t
}

module.exports = cubicIn
},{}],30:[function(require,module,exports){
function cubicOut(t) {
  var f = t - 1.0
  return f * f * f + 1.0
}

module.exports = cubicOut
},{}],31:[function(require,module,exports){
function elasticInOut(t) {
  return t < 0.5
    ? 0.5 * Math.sin(+13.0 * Math.PI/2 * 2.0 * t) * Math.pow(2.0, 10.0 * (2.0 * t - 1.0))
    : 0.5 * Math.sin(-13.0 * Math.PI/2 * ((2.0 * t - 1.0) + 1.0)) * Math.pow(2.0, -10.0 * (2.0 * t - 1.0)) + 1.0
}

module.exports = elasticInOut
},{}],32:[function(require,module,exports){
function elasticIn(t) {
  return Math.sin(13.0 * t * Math.PI/2) * Math.pow(2.0, 10.0 * (t - 1.0))
}

module.exports = elasticIn
},{}],33:[function(require,module,exports){
function elasticOut(t) {
  return Math.sin(-13.0 * (t + 1.0) * Math.PI/2) * Math.pow(2.0, -10.0 * t) + 1.0
}

module.exports = elasticOut
},{}],34:[function(require,module,exports){
function expoInOut(t) {
  return (t === 0.0 || t === 1.0)
    ? t
    : t < 0.5
      ? +0.5 * Math.pow(2.0, (20.0 * t) - 10.0)
      : -0.5 * Math.pow(2.0, 10.0 - (t * 20.0)) + 1.0
}

module.exports = expoInOut
},{}],35:[function(require,module,exports){
function expoIn(t) {
  return t === 0.0 ? t : Math.pow(2.0, 10.0 * (t - 1.0))
}

module.exports = expoIn
},{}],36:[function(require,module,exports){
function expoOut(t) {
  return t === 1.0 ? t : 1.0 - Math.pow(2.0, -10.0 * t)
}

module.exports = expoOut
},{}],37:[function(require,module,exports){
module.exports = {
	'backInOut': require('./back-in-out'),
	'backIn': require('./back-in'),
	'backOut': require('./back-out'),
	'bounceInOut': require('./bounce-in-out'),
	'bounceIn': require('./bounce-in'),
	'bounceOut': require('./bounce-out'),
	'circInOut': require('./circ-in-out'),
	'circIn': require('./circ-in'),
	'circOut': require('./circ-out'),
	'cubicInOut': require('./cubic-in-out'),
	'cubicIn': require('./cubic-in'),
	'cubicOut': require('./cubic-out'),
	'elasticInOut': require('./elastic-in-out'),
	'elasticIn': require('./elastic-in'),
	'elasticOut': require('./elastic-out'),
	'expoInOut': require('./expo-in-out'),
	'expoIn': require('./expo-in'),
	'expoOut': require('./expo-out'),
	'linear': require('./linear'),
	'quadInOut': require('./quad-in-out'),
	'quadIn': require('./quad-in'),
	'quadOut': require('./quad-out'),
	'quartInOut': require('./quart-in-out'),
	'quartIn': require('./quart-in'),
	'quartOut': require('./quart-out'),
	'quintInOut': require('./quint-in-out'),
	'quintIn': require('./quint-in'),
	'quintOut': require('./quint-out'),
	'sineInOut': require('./sine-in-out'),
	'sineIn': require('./sine-in'),
	'sineOut': require('./sine-out')
}
},{"./back-in":20,"./back-in-out":19,"./back-out":21,"./bounce-in":23,"./bounce-in-out":22,"./bounce-out":24,"./circ-in":26,"./circ-in-out":25,"./circ-out":27,"./cubic-in":29,"./cubic-in-out":28,"./cubic-out":30,"./elastic-in":32,"./elastic-in-out":31,"./elastic-out":33,"./expo-in":35,"./expo-in-out":34,"./expo-out":36,"./linear":38,"./quad-in":40,"./quad-in-out":39,"./quad-out":41,"./quart-in":43,"./quart-in-out":42,"./quart-out":44,"./quint-in":46,"./quint-in-out":45,"./quint-out":47,"./sine-in":49,"./sine-in-out":48,"./sine-out":50}],38:[function(require,module,exports){
function linear(t) {
  return t
}

module.exports = linear
},{}],39:[function(require,module,exports){
function quadInOut(t) {
    t /= 0.5
    if (t < 1) return 0.5*t*t
    t--
    return -0.5 * (t*(t-2) - 1)
}

module.exports = quadInOut
},{}],40:[function(require,module,exports){
function quadIn(t) {
  return t * t
}

module.exports = quadIn
},{}],41:[function(require,module,exports){
function quadOut(t) {
  return -t * (t - 2.0)
}

module.exports = quadOut
},{}],42:[function(require,module,exports){
function quarticInOut(t) {
  return t < 0.5
    ? +8.0 * Math.pow(t, 4.0)
    : -8.0 * Math.pow(t - 1.0, 4.0) + 1.0
}

module.exports = quarticInOut
},{}],43:[function(require,module,exports){
function quarticIn(t) {
  return Math.pow(t, 4.0)
}

module.exports = quarticIn
},{}],44:[function(require,module,exports){
function quarticOut(t) {
  return Math.pow(t - 1.0, 3.0) * (1.0 - t) + 1.0
}

module.exports = quarticOut
},{}],45:[function(require,module,exports){
function qinticInOut(t) {
    if ( ( t *= 2 ) < 1 ) return 0.5 * t * t * t * t * t
    return 0.5 * ( ( t -= 2 ) * t * t * t * t + 2 )
}

module.exports = qinticInOut
},{}],46:[function(require,module,exports){
function qinticIn(t) {
  return t * t * t * t * t
}

module.exports = qinticIn
},{}],47:[function(require,module,exports){
function qinticOut(t) {
  return --t * t * t * t * t + 1
}

module.exports = qinticOut
},{}],48:[function(require,module,exports){
function sineInOut(t) {
  return -0.5 * (Math.cos(Math.PI*t) - 1)
}

module.exports = sineInOut
},{}],49:[function(require,module,exports){
function sineIn (t) {
  var v = Math.cos(t * Math.PI * 0.5)
  if (Math.abs(v) < 1e-14) return 1
  else return 1 - v
}

module.exports = sineIn

},{}],50:[function(require,module,exports){
function sineOut(t) {
  return Math.sin(t * Math.PI/2)
}

module.exports = sineOut
},{}],51:[function(require,module,exports){
/* global module */

(function () {
    
    var format = create("{", "}"), output;
    
    function create (left, right) {
        
        if (typeof left !== "string" || typeof right !== "string") {
            throw new Error("Arguments left and right must be strings.");
        }
        
        return function (text, values) {
            
            var key;
            
            if (Array.isArray(values)) {
                values.forEach(function (value, i) {
                    text = text.split(left + (i + 1) + right).join(value);
                });
            }
            else {
                for (key in values) {
                    text = text.split(left + key + right).join(values[key]);
                }
            }
            
            return text;
        };
    }
    
    output = {
        create: create,
        format: format
    };
    
    if (typeof require === "function") {
        module.exports = output;
    }
    else {
        window.VREP = output;
    }
    
}());

},{}],52:[function(require,module,exports){
/* global require */

window.TOOTHROT = require("./interpreter.js");

},{"./interpreter.js":53}],53:[function(require,module,exports){
/* global __line, setInterval, clearInterval */
/* eslint no-console: off */

var KEY_CODE_ENTER = 13;
var KEY_CODE_ESCAPE = 27;
var KEY_CODE_SPACE = 32;
var KEY_CODE_UP = 38;
var KEY_CODE_RIGHT = 39;
var KEY_CODE_DOWN = 40;

var NODE_FADE_IN = 600;
var NODE_FADE_OUT = 300;
var SCREEN_FADE_IN = 400;
var SCREEN_FADE_OUT = 400;
var ACTIONS_FADE_IN = 100;
var ACTIONS_FADE_OUT = 100;

// Wait how long before next() works again after a return?
// This is to prevent popping more stuff from the stack than
// is expected.
var NEXT_RETURN_WAIT = 1000;

var FOCUS_MODE_NODE = "node";
var FOCUS_MODE_ACTIONS = "actions";
var FOCUS_MODE_SCREEN = "screen";
var FOCUS_MODE_MESSAGEBOX = "messagebox";

var NOTIFICATION_DURATION = 3000;

var MAX_SLOTS = 20;

var none = function () {};

var auto = require("enjoy-core/auto");
var compose = require("enjoy-core/compose");
var each = require("enjoy-core/each");
var clone = require("clone");
var merge = require("deepmerge");
var formatter = require("vrep").create;
var format = require("vrep").format;
var Howl = require("howler").Howl;
var classList = require("class-manipulator").list;
var transform = require("transform-js").transform;

var objects = require("./objects.js");
var createNotification = require("./notifications.js").create;

var setStyle = auto(function (element, key, unit, start, end, value) {
    element.style[key] = (start + (value * (end - start))) + unit;
    return value;
});

if (typeof window.btoa !== "function" || typeof window.atob !== "function") {
    alert("Sorry, but your browser is too old to run this site! It will not work as expected.");
    throw new Error("Your browser isn't supported, because it doesn't have " +
        "window.atob() and window.btoa().");
}

var defaultStorage = require("./storage.js");

var nw = (function () {
    try {
        window.require("nw.gui");
        return true;
    }
    catch (error) {
        return false;
    }
}());

var features = {
    fullscreen: hasFullscreen(),
    exit: canExit()
};

function run (resources, _, opt) {
    
    var story = resources.story;
    var container = document.createElement("div");
    
    var templates = resources.templates;
    var defaultScreens = resources.screens;
    var messageBoxTemplate = templates.confirm;
    
    var currentNode, currentSection, key, timeoutId, focusOffset, highlightCurrent;
    var currentSound, currentAmbience, currentMusic;
    var currentScreen, curtainVisible = false;
    var nextClickTime = Date.now();
    
    // General story settings. Can be changed using screens.
    var settings = {
        textSpeed: 50,
        soundVolume: 100,
        ambienceVolume: 100,
        musicVolume: 100
    };
    
    // The story's variables. Available in scripts as: $
    var vars = Object.create(null);
    
    vars._objects = objects.assembleAll(resources.objects || {});
    
    // A stack for remembering which node to return to.
    var stack = [];
    
    // A stack for remembering which screen to return to.
    var screenStack = [];
    
    // The highlighter's current focus mode.
    // Determines which elements can be highlighted.
    var focusMode = FOCUS_MODE_NODE;
    
    var nodes = story.nodes;
    var sections = story.sections;
    
    // All the different DOM elements used by the interpreter:
    
    var ui = document.createElement("div");
    var text = document.createElement("div");
    var indicator = document.createElement("div");
    var background = document.createElement("div");
    
    // The curtain element is used to darken the screen when
    // transitioning from one state to the next, e.g. when
    // the section changes.
    var curtain = document.createElement("div");
    
    // Actions and options are put into a parent element
    // so that clicks can be intercepted and to allow
    // more flexibility in styling the elements with CSS.
    var actionsParent = document.createElement("div");
    var optionsParent = document.createElement("div");
    
    // The background can be dimmed using "dim(amount)" in scripts.
    // This is the element used for this purpose:
    var backgroundDimmer = document.createElement("div");
    
    var actionsContainer = document.createElement("div");
    var optionsContainer = document.createElement("div");
    var screenContainer = document.createElement("div");
    
    // The highlighter is an absolutely positioned element
    // that can be moved over clickable elements by using
    // the arrow keys. Hitting the return key when an element
    // is highlighted will execute a click on the element.
    var highlighter = document.createElement("div");
    
    // When the "reveal" animation for text is started,
    // a function to cancel it is put in here.
    var cancelCharAnimation;
    
    opt = opt || {};
    
    // Determines how to display timers in the story.
    var timerTemplate = opt.timerTemplate || 
        '<div class="TimerBar" style="width: {remaining}%;"></div>';
    
    // Each story should have its own storage key so that
    // one story doesn't overwrite another story's savegames
    // and settings.
    var storageKey = "TOOTHROT-" + story.meta.title;
    
    // Screens can be used to implement simple connected menus.
    // Screens are written in pure HTML and can be styled with CSS.
    // When an element is clicked, the event bubbles up to the
    // screen container where it is decided whether the click means
    // anything and executes any associated actions (e.g. a click
    // on a button is supposed to update something or go to another
    // screen).
    var screens = opt.screens || defaultScreens;
    
    // External listeners can be hooked into the system
    // to allow observing the interpreter's state.
    var listeners = opt.on || {};
    
    // The storage to use. Default is the browser's localStorage.
    // But this can be set using the options to anything with the
    // same API, e.g. a server-side storage using AJAX can be
    // used instead.
    var storage = typeof opt.storage === "function" ?
        opt.storage(storageKey) :
        defaultStorage(storageKey);
    
    // The environment for scripts. It's available in scripts as: _
    var env = {
        link: function (label, target) {
            return insertLink(label, target);
        },
        objectLink: function (label, actions) {
            return insertObjectLink(label, actions);
        },
        dim: function (opacity, duration) {
            return transform(
                backgroundDimmer.style.opacity,
                opacity,
                setOpacity(backgroundDimmer),
                {duration: arguments.length > 1 ? duration : 800},
                function () {
                    vars._dim = opacity;
                }
            );
        },
        o: function (name) {
            return objects.create(name, objects.find(name, vars._objects), insertObjectLink);
        },
        createObject: function (name, prototypes) {
            
            vars._objects[name] = {
                prototypes: prototypes
            };
            
            vars._objects[name] = objects.assemble(name, vars._objects);
        },
        oneOf: function () {
            return arguments[Math.floor(Math.random() * arguments.length)];
        }
    };
    
    // We have internal listeners so that external listeners don't interfere
    // with core features.
    var internalListeners = {
        "updateSetting.soundVolume": function (env, volume) {
            if (currentSound) {
                currentSound.volume(volume / 100);
            }
        },
        "updateSetting.ambienceVolume": function (env, volume) {
            if (currentAmbience) {
                currentAmbience.volume(volume / 100);
            }
        },
        "updateSetting.musicVolume": function (env, volume) {
            if (currentMusic) {
                currentMusic.volume(volume / 100);
            }
        },
        "showScreen": removeInactiveScreenElements,
        "screenEntry": hideGameElements,
        "screenExit": showGameElements
    };
    
    var fullscreenMode = false;
    var currentSlotExists = false;
    
    var notify = createNotification(templates.notification);
    
    _ = _ || {};
    
    for (key in _) {
        env[key] = _[key];
    }
    
    // The container element always has the current section name
    // in the "data-section" attribute so that everything can be
    // styled completely differently for each section.
    container.setAttribute("data-section", nodes.start.section);
    
    container.setAttribute("class", "Toothrot");
    
    text.setAttribute("class", "Text");
    text.setAttribute("aria-live", "polite");
    text.setAttribute("aria-atomic", "true");
    text.setAttribute("aria-relevant", "text");
    text.setAttribute("role", "main");
    
    indicator.setAttribute("class", "NextIndicator");
    indicator.setAttribute("title", "Click or press space to continue");
    indicator.setAttribute("tabindex", "1");
    
    
    highlighter.setAttribute("class", "Highlighter");
    highlighter.setAttribute("data-type", "highlighter");
    background.setAttribute("class", "Background");
    backgroundDimmer.setAttribute("class", "BackgroundDimmer");
    actionsParent.setAttribute("class", "ActionsCurtain");
    actionsContainer.setAttribute("class", "ActionsContainer");
    optionsParent.setAttribute("class", "OptionsCurtain");
    optionsContainer.setAttribute("class", "OptionsContainer");
    screenContainer.setAttribute("class", "ScreenContainer");
    curtain.setAttribute("class", "Curtain");
    
    actionsParent.appendChild(actionsContainer);
    optionsParent.appendChild(optionsContainer);
    container.appendChild(background);
    container.appendChild(backgroundDimmer);
    container.appendChild(text);
    container.appendChild(screenContainer);
    document.body.appendChild(highlighter);
    document.body.appendChild(container);
    document.body.appendChild(ui);
    
    ui.style.opacity = "0";
    
    ui.innerHTML = format(resources.templates.ui, vars);
    
    ui.setAttribute("role", "navigation");
    
    function hideGameElements () {
        resetHighlight();
        ui.style.display = "none";
        text.style.display = "none";
    }
    
    function showGameElements () {
        resetHighlight();
        ui.style.display = "";
        text.style.display = "";
    }
    
    highlighter.addEventListener("click", function (event) {
        event.stopPropagation();
        event.preventDefault();
        executeHighlighter();
    });
    
    actionsParent.addEventListener("click", function (event) {
        if (event.target.getAttribute("data-type") !== "action") {
            event.stopPropagation();
            event.preventDefault();
            animateActionsExit();
        }
    });
    
    optionsParent.addEventListener("click", function (event) {
        if (event.target.getAttribute("data-type") !== "option") {
            event.stopPropagation();
            event.preventDefault();
        }
    });
    
    ui.addEventListener("click", function (event) {
        
        var target = event.target.getAttribute("data-action") ?
            event.target :
            getClickableParent(event.target);
        
        var action = target.getAttribute("data-action");
        var screen = target.getAttribute("data-screen");
        var qsSlot = target.getAttribute("data-slot-name");
        
        if (action === "openScreen") {
            runScreen(screen);
        }
        else if (action === "toggleFullscreen") {
            toggleFullscreen();
        }
        else if (action === "quickSave") {
            save("qs_" + qsSlot, function () {
                notify("Game saved in quick save slot.", "success", NOTIFICATION_DURATION);
            });
        }
        else if (action === "quickLoad") {
            hasSlot("qs_" + qsSlot, function (error, exists) {
                
                if (!exists) {
                    notify("Quick save slot is empty.", "error", NOTIFICATION_DURATION);
                    return;
                }
                
                confirm("Load quick save slot and discard progress?", function (yes) {
                    if (yes) {
                        clearState();
                        load("qs_" + qsSlot, function () {
                            notify(
                                "Game loaded from quick save slot.",
                                "success",
                                NOTIFICATION_DURATION
                            );
                        });
                    }
                });
            });
        }
    });
    
    container.addEventListener("click", function (event) {
        
        var link = event.target, parent;
        
        if (link.getAttribute("data-link-type") === "direct_link") {
            runNode(nodes[link.getAttribute("data-target")]);
        }
        else if (link.getAttribute("data-link-type") === "object_link") {
            showObjectActions(
                link.getAttribute("data-node"),
                link.getAttribute("data-id"),
                link.getAttribute("data-actions"),
                link,
                link.getAttribute("data-object-name")
            );
        }
        else if (link.getAttribute("data-type") === "action") {
            animateActionsExit(undefined, true);
            vars._object = link.getAttribute("data-object-name");
            vars._action = link.getAttribute("data-action-name");
            runNode(nodes[link.getAttribute("data-target")]);
        }
        else if (link.getAttribute("data-type") === "option") {
            
            vars._choice = JSON.parse(window.atob(link.getAttribute("data-value")));
            
            if (link.getAttribute("data-target")) {
                runNode(nodes[link.getAttribute("data-target")]);
            }
            else {
                if (!cancelCharAnimation || !cancelCharAnimation()) {
                    next();
                }
            }
        }
        else {
            
            parent = getClickableParent(event.target);
            
            if (parent !== link && typeof parent.click === "function") {
                return parent.click();
            }
            
            if (!cancelCharAnimation || !cancelCharAnimation()) {
                next();
            }
        }
    });
    
    screenContainer.addEventListener("click", function (event) {
        
        var element = event.target;
        var type = element.getAttribute("data-type");
        var target = element.getAttribute("data-target");
        var action = element.getAttribute("data-action");
        
        event.stopPropagation();
        event.preventDefault();
        
        if (type === "menu-item") {
            if (target in screens) {
                if (element.getAttribute("data-confirm") === "returnToTitle") {
                    confirm("Quit to title and discard progress?", function (yes) {
                        if (yes) {
                            clearState();
                            runScreen(target);
                        }
                    });
                }
                else {
                    runScreen(target);
                }
            }
            else if (target === "start") {
                exitScreenMode();
                runNode(nodes.start);
            }
            else if (target === "continue") {
                clearState();
                exitScreenMode();
                loadCurrentSlot();
            }
            else if (target === "resume") {
                resumeGame();
            }
            else if (target === "exit") {
                confirm("Do you really want to quit?", function (yes) {
                    if (yes) {
                        exit();
                    }
                });
            }
            else if (target === "back") {
                returnToLastScreen();
            }
            else if (target === "saveSettings") {
                updateSettings(returnToLastScreen);
            }
        }
        else if (type === "slot-button") {
            if (action === "save") {
                saveSlot(element);
            }
            else if (action === "load") {
                loadSlot(element);
            }
            else if (action === "delete") {
                deleteSlot(element);
            }
        }
    });
    
    function exitScreenMode (inBetween, then) {
        
        currentScreen = undefined;
        focusMode = FOCUS_MODE_NODE;
        resetHighlight();
        
        screenStack.splice(0, screenStack.length);
        
        animateScreenExit(function () {
            
            if (inBetween) {
                inBetween();
            }
        }, then);
    }
    
    window.addEventListener("keydown", function (event) {
        if (event.keyCode === KEY_CODE_UP || event.keyCode === KEY_CODE_DOWN) {
            event.preventDefault();
        }
    });
    
    window.addEventListener("keyup", function (event) {
        if (event.keyCode === KEY_CODE_RIGHT || event.keyCode === KEY_CODE_SPACE) {
            if (!cancelCharAnimation || !cancelCharAnimation()) {
                next();
            }
        }
        else if (event.keyCode === KEY_CODE_DOWN) {
            focusNext();
        }
        else if (event.keyCode === KEY_CODE_UP) {
            focusPrevious();
        }
        else if (event.keyCode === KEY_CODE_ESCAPE) {
            
            if (focusMode === FOCUS_MODE_ACTIONS) {
                focusMode = FOCUS_MODE_NODE;
                animateActionsExit();
            }
            else if (focusMode === FOCUS_MODE_NODE && typeof focusOffset !== "number") {
                runScreen("pause");
            }
            else if (focusMode === FOCUS_MODE_SCREEN && currentScreen !== "main") {
                returnToLastScreen();
            }
            
            if (typeof focusOffset === "number") {
                resetHighlight();
            }
        }
        else if (event.keyCode === KEY_CODE_ENTER) {
            executeHighlighter();
        }
    });
    
    function executeHighlighter () {
        
        if (typeof focusOffset === "number") {
            
            if (focusMode === FOCUS_MODE_NODE) {
                getFocusedElement().click();
            }
            else if (focusMode === FOCUS_MODE_ACTIONS) {
                getFocusedAction().click();
            }
            else if (focusMode === FOCUS_MODE_SCREEN) {
                getFocusedScreenItem().click();
            }
            else if (focusMode === FOCUS_MODE_MESSAGEBOX) {
                getFocusedBoxButton().click();
            }
            
            resetHighlight();
        }
        else {
            document.activeElement.click();
        }
    }
    
    window.addEventListener("resize", reflowElements);
    window.addEventListener("orientationchange", reflowElements);
    document.addEventListener("fullscreenchange", reflowElements);
    document.addEventListener("webkitfullscreenchange", reflowElements);
    document.addEventListener("mozfullscreenchange", reflowElements);
    document.addEventListener("MSFullscreenChange", reflowElements);
    
    document.title = story.meta.title || "Toothrot Engine";
    
    hasCurrentSlot(function (error, exists) {
        currentSlotExists = !error && exists;
        removeInactiveScreenElements();
        loadSettings(runScreen.bind(undefined, "main", function () {
            ui.style.opacity = "1";
        }));
    });
    
    function clearState () {
        stopAudio();
        currentNode = undefined;
        text.innerHTML = "";
        stack = [];
        container.setAttribute("data-section", nodes.start.section);
        clearVars();
        emit("clearState");
    }
    
    function clearVars () {
        Object.keys(vars).forEach(function (key) {
            delete vars[key];
        });
    }
    
    function loadSettings (then) {
        
        then = then || none;
        
        storage.load("settings", function (error, data) {
            
            if (error) {
                return then(error);
            }
            
            if (!data) {
                storage.save("settings", settings, function () {
                    then();
                });
            }
            else {
                mergeSettings(data.data);
                then();
            }
        });
    }
    
    function mergeSettings (other) {
        for (var key in other) {
            settings[key] = other[key];
        }
    }
    
    function updateSettings (then) {
        
        var settingWidgets = screenContainer.querySelectorAll("*[data-type=setting]");
        
        [].forEach.call(settingWidgets, function (widget) {
            
            var name = widget.getAttribute("data-name");
            var value = widget.value;
            
            if (!name) {
                return;
            }
            
            settings[name] = value;
            
            emit("updateSetting." + name, value);
        });
        
        saveSettings(then);
    }
    
    function saveSettings (then) {
        
        then = then || none;
        
        storage.save("settings", settings, function () {
            then();
        });
    }
    
    function serialize () {
        return JSON.stringify({
            vars: vars,
            stack: stack,
            node: currentNode ? currentNode.id : "start",
            text: text.textContent
        });
    }
    
    function resume (data) {
        
        data = JSON.parse(data);
        
        stack = data.stack;
        vars = data.vars;
        
        if (typeof vars._dim === "number") {
            env.dim(vars._dim, 0);
        }
        
        if (vars._currentSound) {
            playSound(unserializeAudioPath(vars._currentSound));
        }
        
        if (vars._currentAmbience) {
            playAmbience(unserializeAudioPath(vars._currentAmbience));
        }
        
        if (vars._currentMusic) {
            playMusic(unserializeAudioPath(vars._currentMusic));
        }
        
        runNode(nodes[data.node]);
    }
    
    function reflowElements () {
        if (highlightCurrent) {
            highlightCurrent();
        }
    }
    
    function runScreen (name, then) {
        
        var screen = screens[name];
        var isSameScreen = currentScreen === name;
        
        then = then || none;
        focusMode = FOCUS_MODE_SCREEN;
        resetHighlight();
        
        if (!screen) {
            throw new Error("No such screen:" + name);
        }
        
        if (currentScreen && !isSameScreen) {
            screenStack.push(currentScreen);
        }
        
        currentScreen = name;
        
        if (name === "save") {
            showSaveScreen(isSameScreen);
        }
        else {
            if (isSameScreen) {
                replaceScreen();
            }
            else {
                animateScreenEntry(replaceScreen);
            }
        }
        
        function showSaveScreen (isSameScreen) {
            storage.all(function (error, all) {
                
                if (error) {
                    return;
                }
                
                if (isSameScreen) {
                    replace();
                }
                else {
                    animateScreenEntry(replace);
                }
                
                function replace () {
                    replaceScreen();
                    populateSlots(all);
                }
            });
        }
        
        function replaceScreen () {
            
            var content = format(screen, settings);
            
            content = formatter("{$", "}")(content, vars);
            
            screenContainer.innerHTML = content;
            
            each(function (script) {
                evalScript(story, env, vars, script.innerHTML, 0);
            }, screenContainer.querySelectorAll("script"));
            
            emit("showScreen");
            then();
        }
        
        function getDomNodeContent (dom) {
            
            var mockParent = document.createElement("div");
            
            mockParent.appendChild(dom.cloneNode(true));
            
            return mockParent.innerHTML;
        }
        
        function populateSlots (slots) {
            
            var slotContainer = screenContainer.querySelector("*[data-type=slots]");
            var template = screenContainer.querySelector("*[data-template-name=slot]");
            var empty = screenContainer.querySelector("*[data-template-name=empty-slot]");
            var i, currentSlot, tpl, emptyTpl;
            
            template.parentNode.removeChild(template);
            empty.parentNode.removeChild(empty);
            
            slotContainer.innerHTML = "";
            
            tpl = getDomNodeContent(template);
            emptyTpl = getDomNodeContent(empty);
            
            for (i = 0; i < MAX_SLOTS; i += 1) {
                
                currentSlot = slots["slot_" + (i + 1)];
                
                if (currentSlot) {
                    slotContainer.innerHTML += insertVars(tpl, currentSlot, i + 1);
                }
                else {
                    slotContainer.innerHTML += insertVars(emptyTpl, null, i + 1);
                }
            }
            
            if (!currentNode) {
                removeSaveButtons();
            }
            
            function removeSaveButtons () {
                
                var buttons = document.querySelectorAll("*[data-type=slot-button]");
                
                [].forEach.call(buttons, function (button) {
                    
                    if (button.getAttribute("data-action") !== "save") {
                        return;
                    }
                    
                    button.parentNode.removeChild(button);
                });
            }
            
            function insertVars (tpl, slot, i) {
                
                var data;
                
                tpl = tpl.replace(/\{id\}/g, "slot_" + i);
                tpl = tpl.replace(/\{i\}/g, "" + i);
                
                if (!slot) {
                    return tpl;
                }
                
                data = JSON.parse(slot.data);
                
                tpl = tpl.replace(/\{name\}/g, slot.name);
                tpl = tpl.replace(/\{text\}/g, trimText(data.text, 100) || "???");
                tpl = tpl.replace(/\{time\}/g, formatTime(slot.time));
                
                return tpl;
            }
        }
    }
    
    function trimText (text, length) {
        return (text.length > length ? text.substring(0, length - 3) + "..." : text);
    }
    
    function formatTime (time) {
        
        var date = new Date(time);
        
        return "" + date.getFullYear() + "/" + (date.getMonth() + 1) + "/" + date.getDate() +
            " " + pad(date.getHours()) + ":" + pad(date.getMinutes());
            
        function pad (num) {
            return (num < 10 ? "0": "") + num;
        }
    }
    
    function returnToLastScreen () {
        
        var lastScreen;
        
        if (screenStack.length < 1) {
            return resumeGame();
        }
        
        lastScreen = screenStack.pop();
        
        if (!screenStack.length) {
            currentScreen = undefined;
        }
        
        runScreen(lastScreen);
    }
    
    function resumeGame () {
        animateScreenExit();
        currentScreen = undefined;
        focusMode = FOCUS_MODE_NODE;
        return;
    }
    
    function loadCurrentSlot () {
        load("current");
    }
    
    function hasCurrentSlot (then) {
        return hasSlot("current", then);
    }
    
    function hasSlot (name, then) {
        storage.load(name, function (error, data) {
            then(error, !!data);
        });
    }
    
    function load (name, then) {
        
        then = then || none;
        
        storage.load(name, function (error, data) {
            
            if (error) {
                return;
            }
            
            resume(data.data);
            then();
        });
    }
    
    function save (name, then) {
        
        then = then || none;
        
        storage.save(name, serialize(), function (error) {
            
            if (error) {
                return;
            }
            
            then();
        });
    }
    
    function saveSlot (element) {
        
        var id = element.getAttribute("data-slot-id");
        var isEmpty = !!element.getAttribute("data-is-empty");
        
        if (isEmpty) {
            save(id, function () {
                runScreen("save");
            });
        }
        else {
            confirm("Overwrite slot?", function (yes) {
                if (yes) {
                    save(id, function () {
                        runScreen("save");
                    });
                }
            });
        }
    }
    
    function loadSlot (element) {
        
        var id = element.getAttribute("data-slot-id");
        
        if (currentNode) {
            confirm("Load slot and discard current progress?", function (yes) {
                if (yes) {
                    clearState();
                    exitScreenMode(function () {
                        load(id);
                    });
                }
            });
        }
        else {
            clearState();
            exitScreenMode(function () {
                load(id);
            });
        }
    }
    
    function deleteSlot (element) {
        
        var id = element.getAttribute("data-slot-id");
        
        confirm("Really delete slot?", function (yes) {
            if (yes) {
                storage.remove(id);
                runScreen("save");
            }
        });
    }
    
    function runNode (node, nextType) {
        
        var content = node.content;
        var copy = merge(clone(sections[node.section]), clone(node));
        var skipTo;
        
        focusMode = FOCUS_MODE_NODE;
        resetHighlight();
        
        if (timeoutId) {
            clearInterval(timeoutId);
            timeoutId = undefined;
        }
        
        env.skipTo = function (id) {
            skipTo = id;
        };
        
        env.node = function () {
            return copy;
        };
        
        env.addOption = function (label, target, value) {
            copy.options.push({
                type: "option",
                value: value || "",
                line: 0,
                label: "" + label,
                target: "" + (target || "")
            });
        };
        
        copy.scripts.forEach(function (script, i) {
            
            var result;
            
            try {
                result = evalScript(story, env, vars, script.body, script.line);
            }
            catch (error) {
                console.error("Cannot execute script at line " + script.line + ":", error);
            }
            
            content = content.replace("(%s" + i + "%)", result);
        });
        
        if (skipTo) {
            return runNode(nodes[skipTo]);
        }
        
        if (currentNode && !node.parent && nextType !== "return") {
            
            if (stack.indexOf(currentNode.id) >= 0) {
                stack.splice(0, stack.length);
            }
            
            stack.push(currentNode.id);
        }
        
        if (!currentNode) {
            replaceContent();
        }
        else if (node.section !== currentSection) {
            animateSectionTransition();
        }
        else {
            animateNodeTransition();
        }
        
        function animateNodeTransition () {
            animateNodeExit(function () {
                window.scrollTo(0, 0);
                replaceContent();
                setTimeout(function () {
                    animateNodeEntry();
                }, 50);
            });
        }
        
        function animateSectionTransition () {
            animateNodeExit(function () {
                // window.scrollTo(0, 0);
                animateSectionExit(function () {
                    container.setAttribute("data-section", node.section);
                    animateSectionEntry(function () {
                        replaceContent();
                        setTimeout(function () {
                            animateNodeEntry();
                        }, 50);
                    });
                });
            });
        }
        
        function replaceContent () {
            
            currentNode = node;
            currentSection = node.section;
            
            container.setAttribute("data-node-id", currentNode.id);
            container.setAttribute("data-section", currentNode.section);
            
            copy.links.forEach(function (link, i) {
                if (link.type === "direct_link") {
                    content = content.replace(
                        "(%l" + i + "%)",
                        insertLink(link.label, link.target)
                    );
                }
                else if (link.type === "object_link") {
                    content = content.replace(
                        "(%l" + i + "%)",
                        insertObjectLink(link.label, undefined, node.id, i)
                    );
                }
            });
            
            content = content.replace(/\(\$((.|\n)*?)\$\)/g, function (match, p1) {
                
                var key = p1.trim();
                
                if (typeof vars[key] !== "undefined") {
                    return vars[key];
                }
                
                console.warn("Undefined variable in node '" + node.id +
                    "' (line " + node.line + "): " + key);
                
                return "";
            });
            
            content = (function () {
                
                var mockParent = document.createElement("div");
                
                mockParent.innerHTML = content;
                
                markCharacters(mockParent);
                
                return mockParent.innerHTML;
            }());
            
            text.innerHTML = content;
            
            setTimeout(function () {
                
                var className = "fitsInWindow";
                
                if (fitsInWindow(text)) {
                    classList(text).add(className).apply();
                }
                else {
                    classList(text).remove(className).apply();
                }
            }, 50);
            
            if (copy.audio === false) {
                stopAudio();
            }
            
            if (copy.sound) {
                playSound(copy.sound);
            }
            else {
                stopSound();
            }
            
            if (copy.ambience) {
                playAmbience(copy.ambience);
            }
            else if (copy.ambience === false) {
                stopAmbience();
            }
            
            if (copy.music) {
                playMusic(copy.music);
            }
            else if (copy.music === false) {
                stopMusic();
            }
            
            if (
                copy.options.length ||
                copy.timeout ||
                copy.links.length ||
                copy.reveal === false ||
                settings.textSpeed >= 100
            ) {
                insertSpecials();
            }
            else {
                insertSpecials();
                hideCharacters(text);
                cancelCharAnimation = revealCharacters(
                    text,
                    ((settings.textSpeed / 100) * 90) + 10
                ).cancel;
            }
            
            function insertSpecials () {
                
                if (typeof copy.timeout === "number") {
                    addTimer(text, copy);
                }
                
                if (copy.options.length) {
                    addOptions(text, copy);
                }
                
                if (copy.next || copy.returnToLast) {
                    text.appendChild(indicator);
                }
            }
            
            currentSlotExists = true;
            storage.save("current", serialize());
            
            // text.focus();
            
        }
    }
    
    function revealCharacters (element, speed, then) {
        
        var chars = element.querySelectorAll(".Char");
        var offset = 1000 / (speed || 40);
        var stop = false;
        var timeouts = [];
        var left = chars.length;
        
        then = then || function () {};
        
        [].forEach.call(chars, function (char, i) {
            
            var id = setTimeout(function () {
                
                if (stop) {
                    return;
                }
                
                transform(0, 1, setOpacity(char), {duration: 10 * offset}, function () {
                    
                    left -= 1;
                    
                    if (stop) {
                        return;
                    }
                    
                    if (left <= 0) {
                        then();
                    }
                    
                });
                
            }, i * offset);
            
            timeouts.push(id);
        });
        
        function cancel () {
            
            if (stop || left <= 0) {
                return false;
            }
            
            stop = true;
            
            timeouts.forEach(function (id) {
                clearTimeout(id);
            });
            
            [].forEach.call(chars, function (char) {
                char.style.opacity = "1";
            });
            
            then();
            
            return true;
        }
        
        return {
            cancel: cancel
        };
    }
    
    function hideCharacters (element) {
        
        var chars = element.querySelectorAll(".Char");
        
        [].forEach.call(chars, function (char) {
            char.style.opacity = 0;
        });
    }
    
    function markCharacters (element, offset) {
        
        var TEXT_NODE = 3;
        var ELEMENT = 1;
        
        offset = offset || 0;
        
        [].forEach.call(element.childNodes, function (child) {
            
            var text = "", newNode;
            
            if (child.nodeType === TEXT_NODE) {
                
                [].forEach.call(child.textContent, function (char) {
                    text += '<span class="Char" data-char="' + offset + '">' + char + '</span>';
                    offset += 1;
                });
                
                newNode = document.createElement("span");
                
                newNode.setAttribute("class", "CharContainer");
                
                newNode.innerHTML = text;
                
                child.parentNode.replaceChild(newNode, child);
            }
            else if (child.nodeType === ELEMENT) {
                offset = markCharacters(child, offset);
            }
        });
        
        return offset;
    }
    
    window.markCharacters = markCharacters;
    
    function next () {
        
        if (focusMode !== FOCUS_MODE_NODE || !currentNode) {
            return;
        }
        
        if (currentNode.next) {
            runNode(nodes[currentNode.next], "next");
            nextClickTime = Date.now();
        }
        else if (currentNode.returnToLast && nextClickWaitTimeReached()) {
            runNode(nodes[stack.pop()], "return");
            nextClickTime = Date.now();
        }
        
    }
    
    function nextClickWaitTimeReached () {
        return Date.now() - nextClickTime > NEXT_RETURN_WAIT;
    }
    
    function showCurtain (then) {
        
        if (curtainVisible) {
            return then();
        }
        
        container.appendChild(curtain);
        curtain.style.display = "";
        curtainVisible = true;
        
        setTimeout(function () {
            transform(0, 1, setOpacity(curtain), {duration: SCREEN_FADE_IN}, then)
        }, 50);
        
    }
    
    function hideCurtain (then) {
        
        if (!curtainVisible) {
            return then();
        }
        
        curtainVisible = false;
        
        transform(1, 0, setOpacity(curtain), {duration: SCREEN_FADE_OUT}, function () {
            
            curtain.style.display = "none";
            
            try {
                container.removeChild(curtain);
            }
            catch (error) {
                console.error(error);
            }
            
            if (then) {
                then();
            }
        });
    }
    
    function animateSectionExit (then) {
        showCurtain(then);
    }
    
    function animateSectionEntry (then) {
        hideCurtain(then);
    }
    
    function setOpacity (element) {
        return function (v) {
            element.style.opacity = v;
        };
    }
    
    function animateNodeExit (then) {
        transform(1, 0, setOpacity(text), {duration: NODE_FADE_OUT}, then);
    }
    
    function animateNodeEntry (then) {
        transform(0, 1, setOpacity(text), {duration: NODE_FADE_IN}, then);
    }
    
    function animateActionsEntry (then) {
        actionsParent.style.opacity = "0";
        container.appendChild(actionsParent);
        transform(0, 1, setOpacity(actionsParent), {duration: ACTIONS_FADE_IN}, then);
    }
    
    function animateActionsExit (then, noNodeEntry) {
        transform(1, 0, setOpacity(actionsParent), {duration: ACTIONS_FADE_OUT}, function () {
            
            focusMode = FOCUS_MODE_NODE;
            container.removeChild(actionsParent);
            clearActions();
            
            if (noNodeEntry) {
                
                if (then) {
                    then();
                }
                
                return;
            }
            
            animateNodeEntry(then);
        });
    }
    
    function animateScreenEntry (inBetween, then) {
        
        then = then || none;
        
        showCurtain(function () {
            
            screenContainer.style.display = "";
            
            emit("screenEntry");
            
            inBetween();
            hideCurtain(function () {
                emit("showScreen");
                then();
            });
        });
    }
    
    function animateScreenExit (then) {
        showCurtain(function () {
            
            focusMode = FOCUS_MODE_NODE;
            screenContainer.style.display = "none";
            screenContainer.innerHTML = "";
            
            emit("screenExit");
            
            hideCurtain(then);
        });
    }
    
    function showObjectActions (nodeId, linkId, actions, eventTarget, objectName) {
        
        var node, link, key;
        
        focusMode = FOCUS_MODE_ACTIONS;
        resetHighlight();
        
        if (linkId) {
            node = nodes[nodeId];
            link = node.links[linkId];
        }
        else if (actions) {
            
            link = {};
            
            try {
                link.target = JSON.parse(window.atob(actions));
            }
            catch (error) {
                throw new Error(
                    "Cannot parse object actions: " + error.message + "; actions: " + actions
                );
            }
        }
        else {
            throw new Error("Object link has neither an ID nor actions.");
        }
        
        for (key in link.target) {
            addAction(key, link.target[key], objectName);
        }
        
        animateNodeExit();
        animateActionsEntry();
        
        emit("showActions");
    }
    
    function addAction (label, target, objectName) {
        
        var option = document.createElement("a");
        
        option.setAttribute("class", "Action");
        option.setAttribute("data-type", "action");
        option.setAttribute("data-target", target);
        option.setAttribute("tabindex", "1");
        option.setAttribute("title", "Action");
        option.setAttribute("data-action-name", label);
        
        if (objectName) {
            option.setAttribute("data-object-name", objectName);
        }
        
        option.innerHTML = label;
        
        actionsContainer.appendChild(option);
    }
    
    function clearActions () {
        actionsContainer.innerHTML = "";
    }
    
    function addOptions (container, node) {
        
        optionsContainer.innerHTML = "";
        
        node.options.forEach(function (option) {
            addOption(option, node);
        });
        
        container.appendChild(optionsParent);
    }
    
    function addOption (opt) {
        
        var option = document.createElement("span");
        
        option.setAttribute("class", "Option");
        option.setAttribute("data-type", "option");
        option.setAttribute("data-target", opt.target);
        option.setAttribute("tabindex", "1");
        option.setAttribute("title", "Option");
        option.setAttribute("data-value", window.btoa(JSON.stringify(opt.value)));
        
        option.innerHTML = opt.label;
        
        optionsContainer.appendChild(option);
    }
    
    function addTimer (text, node) {
        
        var timeout = node.timeout;
        var start = Date.now();
        var timeoutContainer = document.createElement("div");
        
        timeoutContainer.setAttribute("class", "TimeoutContainer");
        timeoutContainer.setAttribute("data-type", "timeout");
        timeoutContainer.setAttribute("data-remaining", "100");
        timeoutContainer.setAttribute("data-progress", "0");
        
        updateTimer(100);
        emit("timerStart", timeout);
        
        text.appendChild(timeoutContainer);
        
        function updateTimer (percentage) {
            
            var remaining = 100 - percentage;
            var content = timerTemplate.replace(/{progress}/g, "" + percentage);
            
            content = content.replace(/{remaining}/g, "" + remaining);
            
            timeoutContainer.innerHTML = content;
        }
        
        timeoutId = setInterval(function () {
            
            var time = Date.now() - start;
            var percentage = Math.round(time / (timeout / 100));
            var options = node.options;
            
            if (percentage >= 100) {
                percentage = 100;
                updateTimer(percentage);
                clearInterval(timeoutId);
                timeoutId = undefined;
            }
            else {
                updateTimer(percentage);
                return;
            }
            
            emit("timerEnd");
            resetHighlight();
            
            if (options.length && typeof node.defaultOption === "number") {
                
                if (node.defaultOption < 0 || node.defaultOption >= options.length) {
                    throw new Error("Unknown default option '" + node.defaultOption +
                        "' in node '" + node.id + "' (line " + node.line + ").");
                }
                
                vars._choice = options[node.defaultOption].value;
                
                runNode(nodes[options[node.defaultOption].target]);
            }
            else if (options.length) {
                
                vars._choice = options[0].value;
                
                runNode(nodes[options[0].target]);
            }
            else {
                next();
            }
        }, 50);
    }
    
    function insertLink (label, target) {
        
        if (!nodes[target]) {
            throw new Error(
                "Unknown node referenced in link '" + label + "': " + target + " @" + __line
            );
        }
        
        return '<span class="link direct_link" tabindex="1" data-target="' + target +
            '" data-type="link" title="Link" data-link-type="direct_link">' +
            label + '</span>';
    }
    
    function insertObjectLink (label, actions, nodeId, linkId, objectName) {
        
        var key, html;
        
        html = '<span class="link object_link" tabindex="1" data-type="link" ' + 
            'data-link-type="object_link" title="Object"';
        
        if (typeof nodeId !== "undefined" && typeof linkId !== "undefined") {
            html += ' data-node="' + nodeId + '" data-id="' + linkId + '"';
        }
        else if (actions) {
            
            for (key in actions) {
                if (!nodes[actions[key]]) {
                    throw new Error("Unknown node referenced in object link: " +
                        actions[key] + " @" + __line);
                }
            }
            
            html += ' data-actions="' + window.btoa(JSON.stringify(actions)) + '"';
        }
        else {
            throw new Error("Object link without ID or actions.");
        }
        
        if (objectName) {
            html += ' data-object-name="' + objectName + '"';
        }
        
        html += '>' + label + '</span>';
        
        return html;
    }
    
    function getScrollX () {
        return (window.pageXOffset || document.scrollLeft || 0) - (document.clientLeft || 0);
    }
    
    function getScrollY () {
        return (window.pageYOffset || document.scrollTop || 0) - (document.clientTop || 0);
    }
    
    function scrollToElement (element) {
        
        if (isElementInView(element)) {
            return;
        }
        
        try {
            element.scrollIntoView();
        }
        catch (error) {
            console.error(error);
        }
    }
    
    function isElementInView (element) {
        
        var rect = getAbsoluteRect(element);
        var scrollX = getScrollX();
        var scrollY = getScrollY();
        var xInView = (scrollX <= rect.left) && (rect.left <= (scrollX + window.innerWidth));
        var yInView = (scrollY <= rect.top) && (rect.top <= (scrollY + window.innerHeight));
        
        return (xInView && yInView);
    }
    
    function fitsInWindow (element) {
        
        var rect = element.getBoundingClientRect();
        
        return ((rect.width < window.innerWidth) && (rect.height < window.innerHeight));
    }
    
    function getAbsoluteRect (element) {
        
        var rect = element.getBoundingClientRect();
        
        return {
            left: rect.left + getScrollX(),
            top: rect.top + getScrollY(),
            width: rect.width,
            height: rect.height
        };
    }
    
    function highlight (element) {
        
        var padding = 1;
        var sourceRect = getAbsoluteRect(highlighter);
        var targetRect = getAbsoluteRect(element);
        var setHighlighterStyle = setStyle(highlighter);
        
        var left = targetRect.left - padding;
        var top = targetRect.top - padding;
        var width = targetRect.width + (2 * padding);
        var height = targetRect.height + (2 * padding);
        var currentOpacity = +highlighter.style.opacity || 0;
        
        var setX = setHighlighterStyle("left", "px", sourceRect.left, left);
        var setY = setHighlighterStyle("top", "px", sourceRect.top, top);
        var setWidth = setHighlighterStyle("width", "px", sourceRect.width, width);
        var setHeight = setHighlighterStyle("height", "px", sourceRect.height, height);
        var setOpacity = setHighlighterStyle("opacity", "", currentOpacity, 1);
        
        var setValues = compose(setX, setY, setWidth, setHeight, setOpacity);
        
        highlightCurrent = highlight.bind(undefined, element);
        
        emit("focusChange", element);
        
        transform(0, 1, setValues, {duration: 200, fps: 60});
        
        setTimeout(function () {
            scrollToElement(element);
        }, 10);
    }
    
    function resetHighlight () {
        
        var setHighlighterStyle = setStyle(highlighter);
        var sourceRect = getAbsoluteRect(highlighter);
        
        var setValues = compose(
            setHighlighterStyle("left", "px", sourceRect.left, 0),
            setHighlighterStyle("top", "px", sourceRect.top, 0),
            setHighlighterStyle("width", "px", sourceRect.width, 0),
            setHighlighterStyle("height", "px", sourceRect.height, 0),
            setHighlighterStyle("opacity", "", (+highlighter.style.opacity || 0), 0)
        );
        
        focusOffset = undefined;
        highlightCurrent = undefined;
        
        transform(0, 1, setValues, {duration: 200, fps: 60});
    }
    
    function focusPrevious () {
        if (focusMode === FOCUS_MODE_NODE && countFocusableElements()) {
            focusPreviousDefault();
        }
        else if (focusMode === FOCUS_MODE_ACTIONS && countFocusableActions()) {
            focusPreviousAction();
        }
        else if (focusMode === FOCUS_MODE_SCREEN && countFocusableScreenItems()) {
            focusPreviousScreenItem();
        }
        else if (focusMode === FOCUS_MODE_MESSAGEBOX && countFocusableBoxButtons()) {
            focusPreviousBoxButton();
        }
    }
    
    function focusNext () {
        if (focusMode === FOCUS_MODE_NODE && countFocusableElements()) {
            focusNextDefault();
        }
        else if (focusMode === FOCUS_MODE_ACTIONS && countFocusableActions()) {
            focusNextAction();
        }
        else if (focusMode === FOCUS_MODE_SCREEN && countFocusableScreenItems()) {
            focusNextScreenItem();
        }
        else if (focusMode === FOCUS_MODE_MESSAGEBOX && countFocusableBoxButtons()) {
            focusNextBoxButton();
        }
    }
    
    function getFocusedElement () {
        
        var options = document.querySelectorAll("[data-type=option]");
        var links = document.querySelectorAll("[data-type=link]");
        var buttons = document.querySelectorAll("[data-type=button]");
        
        if (focusOffset < options.length) {
            return options[focusOffset];
        }
        else if (focusOffset < options.length + links.length) {
            return links[focusOffset - options.length];
        }
        else {
            return buttons[focusOffset - options.length - links.length];
        }
    }
    
    function countFocusableElements () {
        
        var options = document.querySelectorAll("[data-type=option]");
        var links = document.querySelectorAll("[data-type=link]");
        var buttons = document.querySelectorAll("[data-type=button]");
        
        return options.length + links.length + buttons.length;
    }
    
    function getFocusedAction () {
        return document.querySelectorAll("[data-type=action]")[focusOffset];
    }
    
    function getFocusedScreenItem () {
        return screenContainer.querySelectorAll("[data-type=menu-item]")[focusOffset];
    }
    
    function getFocusedBoxButton () {
        return container.querySelectorAll("[data-type=messagebox-button]")[focusOffset];
    }
    
    function countFocusableScreenItems () {
        return screenContainer.querySelectorAll("[data-type=menu-item]").length;
    }
    
    function countFocusableActions () {
        return document.querySelectorAll("[data-type=action]").length;
    }
    
    function countFocusableBoxButtons () {
        return document.querySelectorAll("[data-type=messagebox-button]").length;
    }
    
    function focusNextDefault () {
        focusNextThing(getFocusedElement, countFocusableElements);
    }
    
    function focusNextAction () {
        focusNextThing(getFocusedAction, countFocusableActions);
    }
    
    function focusNextScreenItem () {
        focusNextThing(getFocusedScreenItem, countFocusableScreenItems);
    }
    
    function focusNextBoxButton () {
        focusNextThing(getFocusedBoxButton, countFocusableBoxButtons);
    }
    
    function focusNextThing (get, count) {
        
        var element;
        
        if (typeof focusOffset !== "number") {
            focusOffset = -1;
        }
        
        focusOffset += 1;
        
        if (focusOffset > count() - 1) {
            focusOffset = 0;
        }
        
        element = get();
        emit("focusNext", element);
        
        highlight(element);
    }
    
    function focusPreviousDefault () {
        focusPreviousThing(getFocusedElement, countFocusableElements);
    }
    
    function focusPreviousAction () {
        focusPreviousThing(getFocusedAction, countFocusableActions);
    }
    
    function focusPreviousScreenItem () {
        focusPreviousThing(getFocusedScreenItem, countFocusableScreenItems);
    }
    
    function focusPreviousBoxButton () {
        focusPreviousThing(getFocusedBoxButton, countFocusableBoxButtons);
    }
    
    function focusPreviousThing (get, count) {
        
        var element;
        
        if (typeof focusOffset !== "number") {
            focusOffset = 0;
        }
        
        focusOffset -= 1;
        
        if (focusOffset < 0) {
            focusOffset = count() - 1;
        }
        
        element = get();
        emit("focusPrevious", element);
        
        highlight(element);
    }
    
    function emit (channel, data) {
        
        if (typeof listeners[channel] === "function") {
            listeners[channel]({
                env: env,
                vars: vars,
                stack: stack
            }, data);
        }
        
        if (typeof internalListeners[channel] === "function") {
            internalListeners[channel]({
                env: env,
                vars: vars,
                stack: stack
            }, data);
        }
    }
    
    function confirm (text, then) {
        
        var boxContainer = document.createElement("div");
        var oldFocus = focusMode;
        
        focusMode = FOCUS_MODE_MESSAGEBOX;
        resetHighlight();
        
        boxContainer.setAttribute("class", "MessageBoxContainer");
        
        boxContainer.innerHTML = messageBoxTemplate.replace("{message}", text);
        
        boxContainer.addEventListener("click", onClick);
        container.appendChild(boxContainer);
        
        boxContainer.focus();
        
        function onClick (event) {
            
            var type = event.target.getAttribute("data-type");
            var value = event.target.getAttribute("data-value");
            
            if (type === "messagebox-button") {
                
                event.stopPropagation();
                event.preventDefault();
                
                focusMode = oldFocus;
                boxContainer.parentNode.removeChild(boxContainer);
                boxContainer.removeEventListener("click", onClick);
                
                then(value === "yes" ? true : false);
            }
        }
    }
    
    function stopAudio () {
        stopSound();
        stopAmbience();
        stopMusic();
    }
    
    function stopSound () {
        
        if (currentSound) {
            currentSound.unload();
        }
        
        vars._currentSound = undefined;
        currentSound = undefined;
    }
    
    function stopAmbience () {
        
        if (currentAmbience) {
            currentAmbience.unload();
        }
        
        vars._currentAmbience = undefined;
        currentAmbience = undefined;
    }
    
    function stopMusic () {
        
        if (currentMusic) {
            currentMusic.unload();
        }
        
        vars._currentMusic = undefined;
        currentMusic = undefined;
    }
    
    function playSound (path) {
        vars._currentSound = serializeAudioPath(path);
        currentSound = playTrack(path, settings.soundVolume, false, currentSound);
    }
    
    function playAmbience (path) {
        
        var serialized = serializeAudioPath(path);
        
        if (currentAmbience && vars._currentAmbience === serialized) {
            return;
        }
        
        vars._currentAmbience = serialized;
        currentAmbience = playTrack(path, settings.ambienceVolume, true, currentAmbience);
    }
    
    function playMusic (path) {
        
        var serialized = serializeAudioPath(path);
        
        if (currentMusic && vars._currentMusic === serialized) {
            return;
        }
        
        vars._currentMusic = serialized;
        currentMusic = playTrack(path, settings.musicVolume, true, currentMusic);
    }
    
    function playTrack (path, volume, loop, current) {
        
        var paths = getAudioPaths(path), audio;
        
        audio = new Howl({
            urls: paths,
            volume: volume / 100,
            loop: loop === true ? true : false
        });
        
        if (current) {
            current.unload();
        }
        
        audio.play();
        
        return audio;
    }
    
    function getAudioPaths (path) {
        
        var paths = [], base;
        
        if (Array.isArray(path)) {
            
            path = path.slice();
            base = path.shift();
            
            path.forEach(function (type) {
                paths.push(base + "." + type);
            });
        }
        else {
            paths.push(path);
        }
        
        return paths;
    }
    
    function serializeAudioPath (path) {
        return JSON.stringify(path);
    }
    
    function unserializeAudioPath (path) {
        return JSON.parse(path);
    }
    
    function toggleFullscreen () {
        
        if (fullscreenEnabled() || (nw && fullscreenMode)) {
            exitFullscreen();
        }
        else {
            fullscreen();
        }
        
        resetHighlight();
        reflowElements();
    }
    
    function fullscreenEnabled () {
        return document.fullscreenElement ||
            document.mozFullScreenElement ||
            document.msFullscreenElement ||
            document.webkitFullscreenElement;
    }
    
    function fullscreen () {
        
        fullscreenMode = true;
        
        if (nw) {
            nwEnterFullscreen();
        }
        else {
            requestFullscreen(document.body);
        }
    }
    
    function exitFullscreen () {
        
        fullscreenMode = false;
        
        if (nw) {
            nwExitFullscreen();
        }
        else {
            exitBrowserFullscreen();
        }
    }
    
    function nwEnterFullscreen () {
        window.require('nw.gui').Window.get().enterKioskMode();
    }
    
    function nwExitFullscreen () {
        window.require('nw.gui').Window.get().leaveKioskMode();
    }
    
    function exitBrowserFullscreen () {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
        else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        }
        else if (document.mozCancelFullScreen) {
            document.mozCancelFullScreen();
        }
        else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        }
    }
    
    function requestFullscreen (element) {
        if (element.requestFullscreen) {
            element.requestFullscreen();
        }
        else if (element.msRequestFullscreen) {
            element.msRequestFullscreen();
        }
        else if (element.mozRequestFullScreen) {
            element.mozRequestFullScreen();
        }
        else if (element.webkitRequestFullscreen) {
            element.webkitRequestFullscreen();
        }
    }
    
    function removeInactiveScreenElements () {
        removeFeatureElements();
        removeContinueButton();
    }
    
    function removeFeatureElements () {
        for (var feature in features) {
            if (!features[feature]) {
                removeElementsForFeature(feature);
            }
        }
    }
    
    function removeContinueButton () {
        
        var buttons;
        
        if (currentSlotExists) {
            return;
        }
        
        buttons = document.querySelectorAll("*[data-target=continue]");
        
        [].forEach.call(buttons || [], function (button) {
            button.parentNode.removeChild(button);
        });
    }
    
    function removeElementsForFeature (feature) {
        
        var elements = document.querySelectorAll("*[data-feature=" + feature + "]") || [];
        
        [].forEach.call(elements, function (element) {
            element.parentNode.removeChild(element);
        });
    }
}

function hasFullscreen () {
    return !!nw;
}

function canExit () {
    return !!nw;
}

function evalScript (__story, _, $, __body, __line) {
    
    var link = _.link;
    var dim = _.dim;
    var objectLink = _.objectLink;
    var nodes = __story.nodes;
    var title = __story.meta.title;
    
    window.__line = __line;
    
    return eval(__body);
}

function getClickableParent (node) {
    
    var ELEMENT = 1;
    var first = node;
    
    while (node.parentNode) {
        
        node = node.parentNode;
        
        if (node.nodeType === ELEMENT && node.getAttribute("data-type")) {
            return node;
        }
    }
    
    return first;
}

function exit () {
    try {
        var gui = window.require("nw.gui");
        gui.App.quit();
    }
    catch (error) {
        console.error("Cannot exit: " + error);
    }
}

function decodeResources (resources) {
    return JSON.parse(decodeURIComponent(window.atob(resources)));
}

module.exports = {
    run: run,
    decode: decodeResources
};


},{"./notifications.js":54,"./objects.js":55,"./storage.js":56,"class-manipulator":5,"clone":6,"deepmerge":7,"enjoy-core/auto":9,"enjoy-core/compose":10,"enjoy-core/each":11,"howler":17,"transform-js":18,"vrep":51}],54:[function(require,module,exports){
/* global require, module, setTimeout */

var format = require("vrep").format;
var transform = require("transform-js").transform;

function create (template, fadeDuration) {
    
    var duration = fadeDuration || 200;
    
    return function (message, type, timeout) {
        
        var container = document.createElement("div");
        var hidden = false;
        var shown = false;
        var currentTransform;
        
        container.setAttribute("class", "NotificationContainer");
        
        type = type || "default";
        
        container.style.opacity = "0";
        container.innerHTML = format(template, {message: message, type: type});
        
        document.body.appendChild(container);
        
        show();
        
        setTimeout(hide, timeout || 2000);
        
        function show () {
            
            if (shown) {
                return;
            }
            
            currentTransform = transform(
                0,
                1,
                function (v) {
                    container.style.opacity = "" + v;
                },
                {duration: duration},
                function () {
                    shown = true;
                    currentTransform = undefined;
                }
           );
        }
        
        function hide () {
            
            if (hidden) {
                return;
            }
            
            currentTransform = transform(
                1,
                0,
                function (v) {
                    container.style.opacity = "" + v;
                },
                {duration: duration},
                function () {
                    currentTransform = undefined;
                    hidden = true;
                    container.parentNode.removeChild(container);
                }
            );
        }
        
        return {
            hide: hide
        };
    };
}

module.exports = {
    create: create
};

},{"transform-js":18,"vrep":51}],55:[function(require,module,exports){
/* global require, module */

var format = require("vrep").format;
var merge = require("deepmerge");

function assemble (name, objects) {
    
    var obj = {};
    var prototypes = (objects[name].prototypes || []).slice();
    
    prototypes.forEach(function (p) {
        obj = merge(obj, assemble(p, objects));
    });
    
    obj.properties = {};
    
    return merge(obj, objects[name]);
}

function assembleAll (objects) {
    
    var key, all = {};
    
    for (key in objects) {
        all[key] = assemble(key, objects);
    }
    
    return all;
}

function create (name, obj, putLink) {
    
    var printLabel = obj.label || name;
    
    var out = {
        add: add,
        drop: drop,
        is: is,
        print: print,
        put: put,
        property: property,
        label: label,
        rewire: rewire
    };
    
    obj.masks = obj.masks || Object.create(null);
    
    function label (newLabel) {
        
        if (newLabel) {
            obj.label = newLabel;
            printLabel = newLabel;
        }
        
        return obj.label;
    }
    
    function print (text) {
        return putLink(text || printLabel, put(), undefined, undefined, name);
    }
    
    function put () {
        
        var actions = {};
        
        obj.activeAspects.forEach(function (aspect) {
            for (var key in obj.aspects[aspect]) {
                actions[key] = (key in obj.masks ? obj.masks[key] : obj.aspects[aspect][key]);
                actions[key] = format(actions[key], {name: name});
            }
        });
        
        return actions;
    }
    
    function is (aspect) {
        return obj.activeAspects.indexOf(aspect) >= 0;
    }
    
    function add (aspect) {
        
        if (!(aspect in obj.aspects)) {
            throw new Error("No such aspect in object '" + name + "': " + aspect);
        }
        
        if (obj.activeAspects.indexOf(aspect) < 0) {
            obj.activeAspects.push(aspect);
        }
        
        return out;
    }
    
    function drop (aspect) {
        
        var index = obj.activeAspects.indexOf(aspect);
        
        if (index >= 0) {
            obj.activeAspects.splice(index, 1);
        }
        
        return out;
    }
    
    function property (key, value) {
        
        if (arguments.length > 1) {
            obj.properties[key] = value;
        }
        
        return obj.properties[key];
    }
    
    function rewire (action, newTarget) {
        obj.masks[action] = newTarget;
        return out;
    }
    
    return out;
}

function find (name, objects) {
    
    if (!objects[name]) {
        throw new Error("Unknown object: " + name);
    }
    
    return objects[name];
}

module.exports = {
    assemble: assemble,
    assembleAll: assembleAll,
    create: create,
    find: find
};

},{"deepmerge":7,"vrep":51}],56:[function(require,module,exports){
/* global using */

//
// Module for storing the game state in local storage.
//
// Savegames look like this:
//

/*
{
    name: "fooBarBaz", // a name. will be given by the engine
    time: 012345678    // timestamp - this must be set by the storage
    data: {}           // this is what the engine gives the storage
}
*/

var storageType, getItem, setItem, memoryStorage = Object.create(null);
var testStorageKey = "TOOTHROT-storage-test";

try {
    
    localStorage.setItem(testStorageKey, "works");
    
    if (localStorage.getItem(testStorageKey) === "works") {
        storageType = "local";
    }
}
catch (error) {
    // ...
}

if (!storageType) {
    
    try {
        
        sessionStorage.setItem(testStorageKey, "works");
        
        if (sessionStorage.getItem(testStorageKey) === "works") {
            storageType = "session";
        }
    }
    catch (error) {
        // ...
    }
}

if (!storageType) {
    storageType = "memory"
}

if (storageType === "local") {
    
    getItem = function (name) {
        return JSON.parse(localStorage.getItem(name) || "{}");
    };
    
    setItem = function (name, value) {
        return localStorage.setItem(name, JSON.stringify(value));
    };
}
else if (storageType === "session") {
    
    getItem = function (name) {
        return JSON.parse(sessionStorage.getItem(name) || "{}");
    };
    
    setItem = function (name, value) {
        return sessionStorage.setItem(name, JSON.stringify(value));
    };
}
else {
    
    getItem = function (name) {
        return JSON.parse(memoryStorage[name] || "{}");
    };
    
    setItem = function (name, value) {
        return memoryStorage[name] = JSON.stringify(value);
    };
}


function storage (storageKey) {
    
    var none = function () {};
    
    storageKey = storageKey || "txe-savegames";
    
    function save (name, data, then) {
        
        var store, error;
        
        then = then || none;
        
        try {
            
            store = getItem(storageKey);
            
            store[name] = {
                name: name,
                time: Date.now(),
                data: data
            };
            
            setItem(storageKey, store);
            
        }
        catch (e) {
            console.error(e);
            error = e;
        }
        
        if (error) {
            return then(error);
        }
        
        then(null, true);
    }
    
    function load (name, then) {
        
        var value, error;
        
        then = then || none;
        
        try {
            value = getItem(storageKey)[name];
        }
        catch (e) {
            console.error(e);
            error = e;
        }
        
        if (error) {
            return then(error);
        }
        
        then(null, value);
    }
    
    function all (then) {
        
        var value, error;
        
        then = then || none;
        
        try {
            value = getItem(storageKey);
        }
        catch (e) {
            console.error(e);
            error = e;
        }
        
        if (error) {
            return then(error);
        }
        
        then(null, value);
    }
    
    function remove (name, then) {
        
        var value, error;
        
        then = then || none;
        
        try {
            value = getItem(storageKey);
        }
        catch (e) {
            console.error(e);
            error = e;
        }
        
        if (error) {
            return then(error);
        }
        
        delete value[name];
        
        setItem(storageKey, value);
        
        then(null, true);
    }
    
    return {
        save: save,
        load: load,
        all: all,
        remove: remove
    };
}

module.exports = storage;

},{}]},{},[52]);
