(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// Patch IE9 and below
try {
  document.createElement('DIV').style.setProperty('opacity', 0, '');
} catch (error) {
  CSSStyleDeclaration.prototype.getProperty = function(a) {
    return this.getAttribute(a);
  };
  
  CSSStyleDeclaration.prototype.setProperty = function(a,b) {
    return this.setAttribute(a, b + '');
  };

  CSSStyleDeclaration.prototype.removeProperty = function(a) {
    return this.removeAttribute(a);
  };
}

/**
 * Module Dependencies.
 */

var Emitter = require('component-emitter');
var query = require('component-query');
var after = require('after-transition');
var has3d = require('has-translate3d');
var ease = require('css-ease');

/**
 * CSS Translate
 */

var translate = has3d
  ? ['translate3d(', ', 0)']
  : ['translate(', ')'];


/**
 * Export `Move`
 */

module.exports = Move;

/**
 * Get computed style.
 */

var style = window.getComputedStyle
  || window.currentStyle;

/**
 * Library version.
 */

Move.version = '0.5.0';

/**
 * Export `ease`
 */

Move.ease = ease;

/**
 * Defaults.
 *
 *   `duration` - default duration of 500ms
 *
 */

Move.defaults = {
  duration: 500
};

/**
 * Default element selection utilized by `move(selector)`.
 *
 * Override to implement your own selection, for example
 * with jQuery one might write:
 *
 *     move.select = function(selector) {
 *       return jQuery(selector).get(0);
 *     };
 *
 * @param {Object|String} selector
 * @return {Element}
 * @api public
 */

Move.select = function(selector){
  if ('string' != typeof selector) return selector;
  return query(selector);
};

/**
 * Initialize a new `Move` with the given `el`.
 *
 * @param {Element} el
 * @api public
 */

function Move(el) {
  if (!(this instanceof Move)) return new Move(el);
  if ('string' == typeof el) el = query(el);
  if (!el) throw new TypeError('Move must be initialized with element or selector');
  this.el = el;
  this._props = {};
  this._rotate = 0;
  this._transitionProps = [];
  this._transforms = [];
  this.duration(Move.defaults.duration)
};


/**
 * Inherit from `EventEmitter.prototype`.
 */

Emitter(Move.prototype);

/**
 * Buffer `transform`.
 *
 * @param {String} transform
 * @return {Move} for chaining
 * @api private
 */

Move.prototype.transform = function(transform){
  this._transforms.push(transform);
  return this;
};

/**
 * Skew `x` and `y`.
 *
 * @param {Number} x
 * @param {Number} y
 * @return {Move} for chaining
 * @api public
 */

Move.prototype.skew = function(x, y){
  return this.transform('skew('
    + x + 'deg, '
    + (y || 0)
    + 'deg)');
};

/**
 * Skew x by `n`.
 *
 * @param {Number} n
 * @return {Move} for chaining
 * @api public
 */

Move.prototype.skewX = function(n){
  return this.transform('skewX(' + n + 'deg)');
};

/**
 * Skew y by `n`.
 *
 * @param {Number} n
 * @return {Move} for chaining
 * @api public
 */

Move.prototype.skewY = function(n){
  return this.transform('skewY(' + n + 'deg)');
};

/**
 * Translate `x` and `y` axis.
 *
 * @param {Number|String} x
 * @param {Number|String} y
 * @return {Move} for chaining
 * @api public
 */

Move.prototype.translate =
Move.prototype.to = function(x, y){
  return this.transform(translate.join(''
    + fixUnits(x) + ', '
    + fixUnits(y || 0)));
};

/**
 * Translate on the x axis to `n`.
 *
 * @param {Number|String} n
 * @return {Move} for chaining
 * @api public
 */

Move.prototype.translateX =
Move.prototype.x = function(n){
  return this.transform('translateX(' + fixUnits(n) + ')');
};

/**
 * Translate on the y axis to `n`.
 *
 * @param {Number|String} n
 * @return {Move} for chaining
 * @api public
 */

Move.prototype.translateY =
Move.prototype.y = function(n){
  return this.transform('translateY(' + fixUnits(n) + ')');
};

/**
 * Scale the x and y axis by `x`, or
 * individually scale `x` and `y`.
 *
 * @param {Number} x
 * @param {Number} y
 * @return {Move} for chaining
 * @api public
 */

Move.prototype.scale = function(x, y){
  return this.transform('scale('
    + x + ', '
    + (y || x)
    + ')');
};

/**
 * Scale x axis by `n`.
 *
 * @param {Number} n
 * @return {Move} for chaining
 * @api public
 */

Move.prototype.scaleX = function(n){
  return this.transform('scaleX(' + n + ')')
};

/**
 * Apply a matrix transformation
 *
 * @param {Number} m11 A matrix coefficient
 * @param {Number} m12 A matrix coefficient
 * @param {Number} m21 A matrix coefficient
 * @param {Number} m22 A matrix coefficient
 * @param {Number} m31 A matrix coefficient
 * @param {Number} m32 A matrix coefficient
 * @return {Move} for chaining
 * @api public
 */

Move.prototype.matrix = function(m11, m12, m21, m22, m31, m32){
  return this.transform('matrix(' + [m11,m12,m21,m22,m31,m32].join(',') + ')');
};

/**
 * Scale y axis by `n`.
 *
 * @param {Number} n
 * @return {Move} for chaining
 * @api public
 */

Move.prototype.scaleY = function(n){
  return this.transform('scaleY(' + n + ')')
};

/**
 * Rotate `n` degrees.
 *
 * @param {Number} n
 * @return {Move} for chaining
 * @api public
 */

Move.prototype.rotate = function(n){
  return this.transform('rotate(' + n + 'deg)');
};

/**
 * Set transition easing function to to `fn` string.
 *
 * When:
 *
 *   - null "ease" is used
 *   - "in" "ease-in" is used
 *   - "out" "ease-out" is used
 *   - "in-out" "ease-in-out" is used
 *
 * @param {String} fn
 * @return {Move} for chaining
 * @api public
 */

Move.prototype.ease = function(fn){
  fn = ease[fn] || fn || 'ease';
  return this.setVendorProperty('transition-timing-function', fn);
};

/**
 * Set animation properties
 *
 * @param {String} name
 * @param {Object} props
 * @return {Move} for chaining
 * @api public
 */

Move.prototype.animate = function(name, props){
  for (var i in props){
    if (props.hasOwnProperty(i)){
      this.setVendorProperty('animation-' + i, props[i])
    }
  }
  return this.setVendorProperty('animation-name', name);
}

/**
 * Set duration to `n`.
 *
 * @param {Number|String} n
 * @return {Move} for chaining
 * @api public
 */

Move.prototype.duration = function(n){
  n = this._duration = 'string' == typeof n
    ? parseFloat(n) * 1000
    : n;
  return this.setVendorProperty('transition-duration', n + 'ms');
};

/**
 * Delay the animation by `n`.
 *
 * @param {Number|String} n
 * @return {Move} for chaining
 * @api public
 */

Move.prototype.delay = function(n){
  n = 'string' == typeof n
    ? parseFloat(n) * 1000
    : n;
  return this.setVendorProperty('transition-delay', n + 'ms');
};

/**
 * Set `prop` to `val`, deferred until `.end()` is invoked.
 *
 * @param {String} prop
 * @param {String} val
 * @return {Move} for chaining
 * @api public
 */

Move.prototype.setProperty = function(prop, val){
  this._props[prop] = val;
  return this;
};

/**
 * Set a vendor prefixed `prop` with the given `val`.
 *
 * @param {String} prop
 * @param {String} val
 * @return {Move} for chaining
 * @api public
 */

Move.prototype.setVendorProperty = function(prop, val){
  this.setProperty('-webkit-' + prop, val);
  this.setProperty('-moz-' + prop, val);
  this.setProperty('-ms-' + prop, val);
  this.setProperty('-o-' + prop, val);
  return this;
};

/**
 * Set `prop` to `value`, deferred until `.end()` is invoked
 * and adds the property to the list of transition props.
 *
 * @param {String} prop
 * @param {String} val
 * @return {Move} for chaining
 * @api public
 */

Move.prototype.set = function(prop, val){
  this.transition(prop);
  this._props[prop] = val;
  return this;
};

/**
 * Increment `prop` by `val`, deferred until `.end()` is invoked
 * and adds the property to the list of transition props.
 *
 * @param {String} prop
 * @param {Number} val
 * @return {Move} for chaining
 * @api public
 */

Move.prototype.add = function(prop, val){
  if (!style) return;
  var self = this;
  return this.on('start', function(){
    var curr = parseInt(self.current(prop), 10);
    self.set(prop, curr + val + 'px');
  });
};

/**
 * Decrement `prop` by `val`, deferred until `.end()` is invoked
 * and adds the property to the list of transition props.
 *
 * @param {String} prop
 * @param {Number} val
 * @return {Move} for chaining
 * @api public
 */

Move.prototype.sub = function(prop, val){
  if (!style) return;
  var self = this;
  return this.on('start', function(){
    var curr = parseInt(self.current(prop), 10);
    self.set(prop, curr - val + 'px');
  });
};

/**
 * Get computed or "current" value of `prop`.
 *
 * @param {String} prop
 * @return {String}
 * @api public
 */

Move.prototype.current = function(prop){
  return style(this.el).getPropertyValue(prop);
};

/**
 * Add `prop` to the list of internal transition properties.
 *
 * @param {String} prop
 * @return {Move} for chaining
 * @api private
 */

Move.prototype.transition = function(prop){
  if (!this._transitionProps.indexOf(prop)) return this;
  this._transitionProps.push(prop);
  return this;
};

/**
 * Commit style properties, aka apply them to `el.style`.
 *
 * @return {Move} for chaining
 * @see Move#end()
 * @api private
 */

Move.prototype.applyProperties = function(){
  for (var prop in this._props) {
    this.el.style.setProperty(prop, this._props[prop], '');
  }
  return this;
};

/**
 * Re-select element via `selector`, replacing
 * the current element.
 *
 * @param {String} selector
 * @return {Move} for chaining
 * @api public
 */

Move.prototype.move =
Move.prototype.select = function(selector){
  this.el = Move.select(selector);
  return this;
};

/**
 * Defer the given `fn` until the animation
 * is complete. `fn` may be one of the following:
 *
 *   - a function to invoke
 *   - an instanceof `Move` to call `.end()`
 *   - nothing, to return a clone of this `Move` instance for chaining
 *
 * @param {Function|Move} fn
 * @return {Move} for chaining
 * @api public
 */

Move.prototype.then = function(fn){
  // invoke .end()
  if (fn instanceof Move) {
    this.on('end', function(){
      fn.end();
    });
  // callback
  } else if ('function' == typeof fn) {
    this.on('end', fn);
  // chain
  } else {
    var clone = new Move(this.el);
    clone._transforms = this._transforms.slice(0);
    this.then(clone);
    clone.parent = this;
    return clone;
  }

  return this;
};

/**
 * Pop the move context.
 *
 * @return {Move} parent Move
 * @api public
 */

Move.prototype.pop = function(){
  return this.parent;
};

/**
 * Reset duration.
 *
 * @return {Move}
 * @api public
 */

Move.prototype.reset = function(){
  this.el.style.webkitTransitionDuration =
  this.el.style.mozTransitionDuration =
  this.el.style.msTransitionDuration =
  this.el.style.oTransitionDuration = '';
  return this;
};

/**
 * Start animation, optionally calling `fn` when complete.
 *
 * @param {Function} fn
 * @return {Move} for chaining
 * @api public
 */

Move.prototype.end = function(fn){
  var self = this;

  // emit "start" event
  this.emit('start');

  // transforms
  if (this._transforms.length) {
    this.setVendorProperty('transform', this._transforms.join(' '));
  }

  // transition properties
  this.setVendorProperty('transition-properties', this._transitionProps.join(', '));
  this.applyProperties();

  // callback given
  if (fn) this.then(fn);

  // emit "end" when complete
  after.once(this.el, function(){
    self.reset();
    self.emit('end');
  });

  return this;
};

/**
 * Fix value units
 *
 * @param {Number|String} val
 * @return {String}
 * @api private
 */

function fixUnits(val) {
  return 'string' === typeof val && isNaN(+val) ? val : val + 'px';
}

},{"after-transition":2,"component-emitter":6,"component-query":7,"css-ease":8,"has-translate3d":9}],2:[function(require,module,exports){
var hasTransitions = require('has-transitions');
var emitter = require('css-emitter');

function afterTransition(el, callback) {
  if(hasTransitions(el)) {
    return emitter(el).bind(callback);
  }
  return callback.apply(el);
};

afterTransition.once = function(el, callback) {
  afterTransition(el, function fn(){
    callback.apply(el);
    emitter(el).unbind(fn);
  });
};

module.exports = afterTransition;
},{"css-emitter":3,"has-transitions":5}],3:[function(require,module,exports){
/**
 * Module Dependencies
 */

var events = require('event');

// CSS events

var watch = [
  'transitionend'
, 'webkitTransitionEnd'
, 'oTransitionEnd'
, 'MSTransitionEnd'
, 'animationend'
, 'webkitAnimationEnd'
, 'oAnimationEnd'
, 'MSAnimationEnd'
];

/**
 * Expose `CSSnext`
 */

module.exports = CssEmitter;

/**
 * Initialize a new `CssEmitter`
 *
 */

function CssEmitter(element){
  if (!(this instanceof CssEmitter)) return new CssEmitter(element);
  this.el = element;
}

/**
 * Bind CSS events.
 *
 * @api public
 */

CssEmitter.prototype.bind = function(fn){
  for (var i=0; i < watch.length; i++) {
    events.bind(this.el, watch[i], fn);
  }
  return this;
};

/**
 * Unbind CSS events
 * 
 * @api public
 */

CssEmitter.prototype.unbind = function(fn){
  for (var i=0; i < watch.length; i++) {
    events.unbind(this.el, watch[i], fn);
  }
  return this;
};

/**
 * Fire callback only once
 * 
 * @api public
 */

CssEmitter.prototype.once = function(fn){
  var self = this;
  function on(){
    self.unbind(on);
    fn.apply(self.el, arguments);
  }
  self.bind(on);
  return this;
};


},{"event":4}],4:[function(require,module,exports){

/**
 * Bind `el` event `type` to `fn`.
 *
 * @param {Element} el
 * @param {String} type
 * @param {Function} fn
 * @param {Boolean} capture
 * @return {Function}
 * @api public
 */

exports.bind = function(el, type, fn, capture){
  if (el.addEventListener) {
    el.addEventListener(type, fn, capture);
  } else {
    el.attachEvent('on' + type, fn);
  }
  return fn;
};

/**
 * Unbind `el` event `type`'s callback `fn`.
 *
 * @param {Element} el
 * @param {String} type
 * @param {Function} fn
 * @param {Boolean} capture
 * @return {Function}
 * @api public
 */

exports.unbind = function(el, type, fn, capture){
  if (el.removeEventListener) {
    el.removeEventListener(type, fn, capture);
  } else {
    el.detachEvent('on' + type, fn);
  }
  return fn;
};

},{}],5:[function(require,module,exports){
/**
 * This will store the property that the current
 * browser uses for transitionDuration
 */
var property;

/**
 * The properties we'll check on an element
 * to determine if it actually has transitions
 * We use duration as this is the only property
 * needed to technically have transitions
 * @type {Array}
 */
var types = [
  "transitionDuration",
  "MozTransitionDuration",
  "webkitTransitionDuration"
];

/**
 * Determine the correct property for this browser
 * just once so we done need to check every time
 */
while(types.length) {
  var type = types.shift();
  if(type in document.body.style) {
    property = type;
  }
}

/**
 * Determine if the browser supports transitions or
 * if an element has transitions at all.
 * @param  {Element}  el Optional. Returns browser support if not included
 * @return {Boolean}
 */
function hasTransitions(el){
  if(!property) {
    return false; // No browser support for transitions
  }
  if(!el) {
    return property != null; // We just want to know if browsers support it
  }
  var duration = getComputedStyle(el)[property];
  return duration !== "" && parseFloat(duration) !== 0; // Does this element have transitions?
}

module.exports = hasTransitions;
},{}],6:[function(require,module,exports){

/**
 * Expose `Emitter`.
 */

module.exports = Emitter;

/**
 * Initialize a new `Emitter`.
 *
 * @api public
 */

function Emitter(obj) {
  if (obj) return mixin(obj);
};

/**
 * Mixin the emitter properties.
 *
 * @param {Object} obj
 * @return {Object}
 * @api private
 */

function mixin(obj) {
  for (var key in Emitter.prototype) {
    obj[key] = Emitter.prototype[key];
  }
  return obj;
}

/**
 * Listen on the given `event` with `fn`.
 *
 * @param {String} event
 * @param {Function} fn
 * @return {Emitter}
 * @api public
 */

Emitter.prototype.on =
Emitter.prototype.addEventListener = function(event, fn){
  this._callbacks = this._callbacks || {};
  (this._callbacks['$' + event] = this._callbacks['$' + event] || [])
    .push(fn);
  return this;
};

/**
 * Adds an `event` listener that will be invoked a single
 * time then automatically removed.
 *
 * @param {String} event
 * @param {Function} fn
 * @return {Emitter}
 * @api public
 */

Emitter.prototype.once = function(event, fn){
  function on() {
    this.off(event, on);
    fn.apply(this, arguments);
  }

  on.fn = fn;
  this.on(event, on);
  return this;
};

/**
 * Remove the given callback for `event` or all
 * registered callbacks.
 *
 * @param {String} event
 * @param {Function} fn
 * @return {Emitter}
 * @api public
 */

Emitter.prototype.off =
Emitter.prototype.removeListener =
Emitter.prototype.removeAllListeners =
Emitter.prototype.removeEventListener = function(event, fn){
  this._callbacks = this._callbacks || {};

  // all
  if (0 == arguments.length) {
    this._callbacks = {};
    return this;
  }

  // specific event
  var callbacks = this._callbacks['$' + event];
  if (!callbacks) return this;

  // remove all handlers
  if (1 == arguments.length) {
    delete this._callbacks['$' + event];
    return this;
  }

  // remove specific handler
  var cb;
  for (var i = 0; i < callbacks.length; i++) {
    cb = callbacks[i];
    if (cb === fn || cb.fn === fn) {
      callbacks.splice(i, 1);
      break;
    }
  }
  return this;
};

/**
 * Emit `event` with the given args.
 *
 * @param {String} event
 * @param {Mixed} ...
 * @return {Emitter}
 */

Emitter.prototype.emit = function(event){
  this._callbacks = this._callbacks || {};
  var args = [].slice.call(arguments, 1)
    , callbacks = this._callbacks['$' + event];

  if (callbacks) {
    callbacks = callbacks.slice(0);
    for (var i = 0, len = callbacks.length; i < len; ++i) {
      callbacks[i].apply(this, args);
    }
  }

  return this;
};

/**
 * Return array of callbacks for `event`.
 *
 * @param {String} event
 * @return {Array}
 * @api public
 */

Emitter.prototype.listeners = function(event){
  this._callbacks = this._callbacks || {};
  return this._callbacks['$' + event] || [];
};

/**
 * Check if this emitter has `event` handlers.
 *
 * @param {String} event
 * @return {Boolean}
 * @api public
 */

Emitter.prototype.hasListeners = function(event){
  return !! this.listeners(event).length;
};

},{}],7:[function(require,module,exports){
function one(selector, el) {
  return el.querySelector(selector);
}

exports = module.exports = function(selector, el){
  el = el || document;
  return one(selector, el);
};

exports.all = function(selector, el){
  el = el || document;
  return el.querySelectorAll(selector);
};

exports.engine = function(obj){
  if (!obj.one) throw new Error('.one callback required');
  if (!obj.all) throw new Error('.all callback required');
  one = obj.one;
  exports.all = obj.all;
  return exports;
};

},{}],8:[function(require,module,exports){

/**
 * CSS Easing functions
 */

module.exports = {
    'in':                'ease-in'
  , 'out':               'ease-out'
  , 'in-out':            'ease-in-out'
  , 'snap':              'cubic-bezier(0,1,.5,1)'
  , 'linear':            'cubic-bezier(0.250, 0.250, 0.750, 0.750)'
  , 'ease-in-quad':      'cubic-bezier(0.550, 0.085, 0.680, 0.530)'
  , 'ease-in-cubic':     'cubic-bezier(0.550, 0.055, 0.675, 0.190)'
  , 'ease-in-quart':     'cubic-bezier(0.895, 0.030, 0.685, 0.220)'
  , 'ease-in-quint':     'cubic-bezier(0.755, 0.050, 0.855, 0.060)'
  , 'ease-in-sine':      'cubic-bezier(0.470, 0.000, 0.745, 0.715)'
  , 'ease-in-expo':      'cubic-bezier(0.950, 0.050, 0.795, 0.035)'
  , 'ease-in-circ':      'cubic-bezier(0.600, 0.040, 0.980, 0.335)'
  , 'ease-in-back':      'cubic-bezier(0.600, -0.280, 0.735, 0.045)'
  , 'ease-out-quad':     'cubic-bezier(0.250, 0.460, 0.450, 0.940)'
  , 'ease-out-cubic':    'cubic-bezier(0.215, 0.610, 0.355, 1.000)'
  , 'ease-out-quart':    'cubic-bezier(0.165, 0.840, 0.440, 1.000)'
  , 'ease-out-quint':    'cubic-bezier(0.230, 1.000, 0.320, 1.000)'
  , 'ease-out-sine':     'cubic-bezier(0.390, 0.575, 0.565, 1.000)'
  , 'ease-out-expo':     'cubic-bezier(0.190, 1.000, 0.220, 1.000)'
  , 'ease-out-circ':     'cubic-bezier(0.075, 0.820, 0.165, 1.000)'
  , 'ease-out-back':     'cubic-bezier(0.175, 0.885, 0.320, 1.275)'
  , 'ease-out-quad':     'cubic-bezier(0.455, 0.030, 0.515, 0.955)'
  , 'ease-out-cubic':    'cubic-bezier(0.645, 0.045, 0.355, 1.000)'
  , 'ease-in-out-quart': 'cubic-bezier(0.770, 0.000, 0.175, 1.000)'
  , 'ease-in-out-quint': 'cubic-bezier(0.860, 0.000, 0.070, 1.000)'
  , 'ease-in-out-sine':  'cubic-bezier(0.445, 0.050, 0.550, 0.950)'
  , 'ease-in-out-expo':  'cubic-bezier(1.000, 0.000, 0.000, 1.000)'
  , 'ease-in-out-circ':  'cubic-bezier(0.785, 0.135, 0.150, 0.860)'
  , 'ease-in-out-back':  'cubic-bezier(0.680, -0.550, 0.265, 1.550)'
};

},{}],9:[function(require,module,exports){

var prop = require('transform-property');

// IE <=8 doesn't have `getComputedStyle`
if (!prop || !window.getComputedStyle) {
  module.exports = false;

} else {
  var map = {
    webkitTransform: '-webkit-transform',
    OTransform: '-o-transform',
    msTransform: '-ms-transform',
    MozTransform: '-moz-transform',
    transform: 'transform'
  };

  // from: https://gist.github.com/lorenzopolidori/3794226
  var el = document.createElement('div');
  el.style[prop] = 'translate3d(1px,1px,1px)';
  document.body.insertBefore(el, null);
  var val = getComputedStyle(el).getPropertyValue(map[prop]);
  document.body.removeChild(el);
  module.exports = null != val && val.length && 'none' != val;
}

},{"transform-property":10}],10:[function(require,module,exports){

var styles = [
  'webkitTransform',
  'MozTransform',
  'msTransform',
  'OTransform',
  'transform'
];

var el = document.createElement('p');
var style;

for (var i = 0; i < styles.length; i++) {
  style = styles[i];
  if (null != el.style[style]) {
    module.exports = style;
    break;
  }
}

},{}],11:[function(require,module,exports){
/* global require */

window.TOOTHROT = require("./interpreter.js");

},{"./interpreter.js":12}],12:[function(require,module,exports){
/* global __line, setInterval, clearInterval */

var KEY_CODE_ENTER = 13;
var KEY_CODE_ESCAPE = 27;
var KEY_CODE_SPACE = 32;
var KEY_CODE_LEFT = 37;
var KEY_CODE_UP = 38;
var KEY_CODE_RIGHT = 39;
var KEY_CODE_DOWN = 40;

var NODE_FADE_IN = 600;
var NODE_FADE_OUT = 300;
var SECTION_FADE_IN = 600;
var SECTION_FADE_OUT = 300;
var SCREEN_FADE_IN = 400;
var SCREEN_FADE_OUT = 400;

// Wait how long before next() works again after a return?
// This is to prevent popping more stuff from the stack than
// is expected.
var NEXT_RETURN_WAIT = 1000;

var FOCUS_MODE_NODE = "node";
var FOCUS_MODE_ACTIONS = "actions";
var FOCUS_MODE_SCREEN = "screen";
var FOCUS_MODE_MESSAGEBOX = "messagebox";

var MAX_SLOTS = 20;

var none = function () {};
var move = require("move-js");

if (typeof window.btoa !== "function" || typeof window.atob !== "function") {
    alert("Sorry, but your browser is too old to run this site! It will not work as expected.");
    throw new Error("Your browser isn't supported, because it doesn't have " +
        "window.atob() and window.btoa().");
}

var defaultStorage = require("./storage.js");

function run (resources, $, opt) {
    
    var story = resources.story;
    var container = document.createElement("div");
    
    var templates = resources.templates;
    var defaultScreens = resources.screens;
    var messageBoxTemplate = templates.confirm;
    
    var currentNode, currentSection, key, timeoutId, focusOffset, highlightCurrent;
    var currentScreen, curtainVisible = false;
    var nextClickTime = Date.now();
    var settings = {};
    var stack = [];
    var screenStack = [];
    var focusMode = FOCUS_MODE_NODE;
    var nodes = story.nodes;
    var vars = Object.create(null);
    var text = document.createElement("div");
    var indicator = document.createElement("div");
    var background = document.createElement("div");
    var curtain = document.createElement("div");
    var backgroundDimmer = document.createElement("div");
    var actionsCurtain = document.createElement("div");
    var actionsContainer = document.createElement("div");
    var optionsCurtain = document.createElement("div");
    var optionsContainer = document.createElement("div");
    var screenContainer = document.createElement("div");
    var highlighter = document.createElement("div");
    var cancelCharAnimation;
    
    opt = opt || {};
    
    var timerTemplate = opt.timerTemplate || 
        '<div class="TimerBar" style="width: {remaining}%;"></div>';
    
    var storageKey = "TE-" + story.meta.title;
    var screens = opt.screens || defaultScreens;
    var listeners = opt.on || {};
    
    var storage = typeof opt.storage === "function" ?
        opt.storage(storageKey) :
        defaultStorage(storageKey);
    
    var env = {
        get: function (key) {
            return vars[key];
        },
        set: function (key, val) {
            vars[key] = val;
        },
        has: function (key) {
            return typeof vars[key] !== "undefined";
        },
        move: move,
        link: function (label, target) {
            return insertLink(label, target);
        },
        objectLink: function (label, actions) {
            return insertObjectLink(label, undefined, undefined, actions);
        },
        dim: function (opacity, duration) {
            return move(backgroundDimmer).
                set("opacity", opacity).
                duration(arguments.length > 1 ? duration : 800).
                end(function () {
                    vars["$$dim"] = opacity;
                });
        }
    };
    
    $ = $ || {};
    
    for (key in $) {
        env[key] = $[key];
    }
    
    container.setAttribute("class", "Toothrot");
    container.setAttribute("data-section", nodes.start.section);
    text.setAttribute("class", "Text");
    indicator.setAttribute("class", "NextIndicator");
    highlighter.setAttribute("class", "Highlighter");
    highlighter.setAttribute("data-type", "highlighter");
    background.setAttribute("class", "Background");
    backgroundDimmer.setAttribute("class", "BackgroundDimmer");
    actionsCurtain.setAttribute("class", "ActionsCurtain");
    actionsContainer.setAttribute("class", "ActionsContainer");
    optionsCurtain.setAttribute("class", "OptionsCurtain");
    optionsContainer.setAttribute("class", "OptionsContainer");
    screenContainer.setAttribute("class", "ScreenContainer");
    curtain.setAttribute("class", "Curtain");
    
    actionsCurtain.appendChild(actionsContainer);
    optionsCurtain.appendChild(optionsContainer);
    container.appendChild(background);
    container.appendChild(backgroundDimmer);
    container.appendChild(text);
    container.appendChild(screenContainer);
    document.body.appendChild(highlighter);
    document.body.appendChild(container);
    
    highlighter.addEventListener("click", function (event) {
        event.stopPropagation();
        event.preventDefault();
        executeHighlighter();
    });
    
    actionsCurtain.addEventListener("click", function (event) {
        if (event.target.getAttribute("data-type") !== "action") {
            event.stopPropagation();
            event.preventDefault();
            animateActionsExit();
        }
    });
    
    optionsCurtain.addEventListener("click", function (event) {
        if (event.target.getAttribute("data-type") !== "option") {
            event.stopPropagation();
            event.preventDefault();
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
                link
            );
        }
        else if (link.getAttribute("data-type") === "action") {
            animateActionsExit(runNode.bind(null, nodes[link.getAttribute("data-target")]));
        }
        else if (link.getAttribute("data-type") === "option") {
            
            vars["$$choice"] = JSON.parse(window.atob(link.getAttribute("data-value")));
            
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
            
            if (parent && typeof parent.click === "function") {
                return parent.click();
            }
            
            if (currentNode && currentNode.options.length) {
                return;
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
                runScreen(target);
            }
            else if (target === "start") {
                exitScreenMode(function () {
                    runNode(nodes.start);
                });
            }
            else if (target === "continue") {
                exitScreenMode(function () {
                    loadCurrentSlot();
                });
            }
            else if (target === "resume") {
                resumeGame();
            }
            else if (target === "back") {
                returnToLastScreen();
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
    
    window.addEventListener("keyup", function (event) {
        if (event.keyCode === KEY_CODE_RIGHT || event.keyCode === KEY_CODE_SPACE) {
            
            if (currentNode && currentNode.options.length) {
                return;
            }
            
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
            else if (focusMode === FOCUS_MODE_NODE) {
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
    }
    
    window.addEventListener("resize", reflowElements);
    window.addEventListener("orientationchange", reflowElements);
    
    loadSettings(runScreen.bind(undefined, "main"));
    
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
        
        if (typeof vars["$$dim"] === "number") {
            env.dim(vars["$$dim"], 0);
        }
        
        runNode(nodes[data.node]);
    }
    
    function reflowElements () {
        if (highlightCurrent) {
            highlightCurrent();
        }
    }
    
    function runScreen (name) {
        
        var screen = screens[name];
        var isSameScreen = currentScreen === name;
        
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
            screenContainer.innerHTML = screen;
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
                console.log("Saved in slot:", id);
                runScreen("save");
            });
        }
        else {
            confirm("Overwrite slot?", function (yes) {
                if (yes) {
                    save(id, function () {
                        console.log("Saved in slot:", id);
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
                    exitScreenMode(function () {
                        load(id);
                    });
                }
            });
        }
        else {
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
        
        focusMode = FOCUS_MODE_NODE;
        resetHighlight();
        
        if (timeoutId) {
            clearInterval(timeoutId);
            timeoutId = undefined;
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
                replaceContent();
                setTimeout(function () {
                    animateNodeEntry();
                }, 50);
            });
        }
        
        function animateSectionTransition () {
            animateNodeExit(function () {
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
            
            node.links.forEach(function (link, i) {
                if (link.type === "direct_link") {
                    content = content.replace(
                        "(%l" + i + "%)",
                        insertLink(link.label, link.target)
                    );
                }
                else if (link.type === "object_link") {
                    content = content.replace(
                        "(%l" + i + "%)",
                        insertObjectLink(link.label, node.id, i)
                    );
                }
            });
            
            node.scripts.forEach(function (script, i) {
                
                var result;
                
                try {
                    result = evalScript(story, env, script.body, script.line);
                }
                catch (error) {
                    console.error("Cannot execute script at line " + script.line + ":", error);
                }
                
                if (typeof result !== "string") {
                    return;
                }
                
                content = content.replace("(%s" + i + "%)", result);
            });
            
            content = content.replace(/\(\$((.|\n)*?)\$\)/g, function (match, p1, p2) {
                
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
            
            if (
                node.options.length ||
                node.timeout ||
                node.links.length ||
                node.reveal === false
            ) {
                insertSpecials();
            }
            else {
                hideCharacters(text);
                cancelCharAnimation = revealCharacters(text, 30, insertSpecials).cancel;
            }
            
            function insertSpecials () {
                
                if (typeof node.timeout === "number") {
                    addTimer(text, node);
                }
                
                if (node.options.length) {
                    addOptions(text, node);
                }
                else if (node.next || node.returnToLast) {
                    text.appendChild(indicator);
                }
            }
            
            storage.save("current", serialize());
            
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
                
                move(char).set("opacity", 1).duration(10 * offset).end(function () {
                    
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
        
        if (focusMode !== FOCUS_MODE_NODE) {
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
            move(curtain).set("opacity", 1).duration(SCREEN_FADE_IN).end(then);
        }, 50);
        
    }
    
    function hideCurtain (then) {
        
        if (!curtainVisible) {
            return then();
        }
        
        curtainVisible = false;
        
        move(curtain).set("opacity", 0).duration(SCREEN_FADE_OUT).end(function () {
            
            curtain.style.display = "none";
            container.removeChild(curtain);
            
            if (then) {
                then();
            }
        });
    }
    
    function animateSectionExit (then) {
        move(container).set("opacity", 0).duration(SECTION_FADE_OUT).end(then);
    }
    
    function animateSectionEntry (then) {
        move(container).set("opacity", 1).duration(SECTION_FADE_IN).end(then);
    }
    
    function animateNodeExit (then) {
        move(text).set("opacity", 0).duration(NODE_FADE_OUT).end(then);
    }
    
    function animateNodeEntry (then) {
        move(text).set("opacity", 1).duration(NODE_FADE_IN).end(then);
    }
    
    function animateActionsEntry (then) {
        move(actionsCurtain).set("opacity", 0).duration(0).end();
        container.appendChild(actionsCurtain);
        move(actionsCurtain).set("opacity", 1).duration(NODE_FADE_IN).end(then);
    }
    
    function animateActionsExit (then) {
        move(actionsCurtain).set("opacity", 0).duration(NODE_FADE_OUT).end(function () {
            
            focusMode === FOCUS_MODE_NODE;
            container.removeChild(actionsCurtain);
            clearActions();
            
            if (then) {
                then();
            }
        });
    }
    
    function animateScreenEntry (inBetween, then) {
        showCurtain(function () {
            
            screenContainer.style.display = "";
            
            emit("screenEntry");
            
            inBetween();
            hideCurtain(then);
        });
    }
    
    function animateScreenExit (then) {
        showCurtain(function () {
            
            focusMode = FOCUS_MODE_NODE;
            screenContainer.style.display = "none";
            screenContainer.innerHTML = "";
            
            emit("screenExit")
            
            hideCurtain(then);
        });
    }
    
    function showObjectActions (nodeId, linkId, actions, eventTarget) {
        
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
            addAction(key, link.target[key]);
        }
        
        positionBelow(actionsContainer, eventTarget);
        animateActionsEntry();
        
        emit("showActions");
    }
    
    function addAction (label, target) {
        
        var option = document.createElement("a");
        
        option.setAttribute("class", "Action");
        option.setAttribute("data-type", "action");
        option.setAttribute("data-target", target);
        
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
        
        container.appendChild(optionsCurtain);
    }
    
    function addOption (opt, node) {
        
        var option = document.createElement("span");
        
        option.setAttribute("class", "Option");
        option.setAttribute("data-type", "option");
        option.setAttribute("data-target", opt.target);
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
            
            if (options.length && typeof node.defaultOption === "number") {
                
                if (node.defaultOption < 0 || node.defaultOption >= options.length) {
                    throw new Error("Unknown default option '" + node.defaultOption +
                        "' in node '" + node.id + "' (line " + node.line + ").");
                }
                
                vars["$$choice"] = options[node.defaultOption].value;
                
                runNode(nodes[options[node.defaultOption].target]);
            }
            else if (options.length) {
                
                vars["$$choice"] = options[0].value;
                
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
        
        return '<span class="link direct_link" data-target="' + target +
            '" data-type="link" data-link-type="direct_link">' +
            label + '</span>';
    }
    
    function insertObjectLink (label, nodeId, linkId, actions) {
        
        var key, html;
        
        html = '<span class="link object_link" data-type="link" ' + 
            'data-link-type="object_link"';
        
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
        
        html += '>' + label + '</span>';
        
        return html;
    }
    
    function highlight (element) {
        
        var left, top, width, height;
        var padding = 1;
        var targetRect = element.getBoundingClientRect();
        
        highlightCurrent = highlight.bind(undefined, element);
        
        left = targetRect.left - padding;
        top = targetRect.top - padding;
        width = targetRect.width + (2 * padding);
        height = targetRect.height + (2 * padding);
        
        emit("focusChange", element);
        
        move(highlighter).
            x(left).
            y(top).
            set("width", width + "px").
            set("height", height + "px").
            set("opacity", 1).
            duration(200).
            ease("out").
            end();
    }
    
    function resetHighlight () {
        focusOffset = undefined;
        highlightCurrent = undefined;
        move(highlighter).
            set("opacity", 0).
            set("width", "0").
            set("height", "0").
            x(0).
            y(0).
            duration(200).
            end();
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
        
        if (focusOffset < options.length) {
            return options[focusOffset];
        }
        else {
            return links[focusOffset];
        }
    }
    
    function countFocusableElements () {
        
        var options = document.querySelectorAll("[data-type=option]");
        var links = document.querySelectorAll("[data-type=link]");
        
        return options.length + links.length;
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
    }
    
    function confirm (text, then) {
        
        var boxContainer = document.createElement("div");
        
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
                
                boxContainer.parentNode.removeChild(boxContainer);
                boxContainer.removeEventListener("click", onClick);
                
                then(value === "yes" ? true : false);
            }
        }
    }
}

function evalScript (__story, $, __body, __line) {
    
    var get = $.get;
    var set = $.set;
    var has = $.has;
    var move = $.move;
    var link = $.link;
    var dim = $.dim;
    var objectLink = $.objectLink;
    var nodes = __story.nodes;
    var title = __story.meta.title;
    
    window.__line = __line;
    
    return eval(__body);
}

function positionBelow (element, anchorElement) {
    
    var rect;
    
    element.style.position = "absolute";
    
    element.style.right = "auto";
    element.style.bottom = "auto";
    
    rect = anchorElement.getBoundingClientRect();
    
    element.style.top = (rect.bottom + rect.height + 10) + "px";
    element.style.left = (rect.left + ((rect.right - rect.left) / 2)) + "px";
}

function getStylePropertyValue (element, property) {
    return window.getComputedStyle(element, null).getPropertyValue(property);
}

function getClickableParent (node) {
    
    var ELEMENT = 1;
    
    while (node.parentNode) {
        
        node = node.parentNode;
        
        if (node.nodeType === ELEMENT && node.getAttribute("data-type")) {
            return node;
        }
    }
}

module.exports = {
    run: run
};


},{"./storage.js":13,"move-js":1}],13:[function(require,module,exports){
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

function storage (storageKey) {
    
    var none = function () {};
    
    storageKey = storageKey || "txe-savegames";
    
    function getItem (name) {
        return JSON.parse(localStorage.getItem(name)) || {};
    }
    
    function setItem (name, data) {
        return localStorage.setItem(name, JSON.stringify(data));
    }
    
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

},{}]},{},[11]);
