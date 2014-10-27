var React = global.React || require('react');
var action = require('./action.js');
var EventEmitter = require('./EventEmitter.js');
var safeDeepClone = require('./safeDeepClone.js');

var flux = {};

function mergeStore (mixins, source, state) {

  source.actions = source.actions || [];
  source.exports = source.exports || {};

  if (mixins && Array.isArray(mixins)) {

    // Merge mixins and state
    mixins.forEach(function (mixin) {
      Object.keys(mixin).forEach(function (key) {

        switch(key) {
          case 'getInitialState':
            var mixinState = mixin.getInitialState();
            Object.keys(mixinState).forEach(function (key) {
              state[key] = mixinState[key];
            });
            break;
          case 'mixins':

            // Return as actions and exports are handled on top traversal level
            return mergeStore(mixin.mixins, mixin, state);
            break;
          case 'actions':
            source.actions = source.actions.concat(mixin.actions);
            break;
          case 'exports':
            Object.keys(mixin.exports).forEach(function (key) {
              source.exports[key] = mixin.exports[key];
            });
            break;
          default:
            source[key] = mixin[key];
        }

      });
    });

  }

  var exports = Object.create(EventEmitter.prototype);

  source.emitChange = function () {
    exports.emit('change');
  };

  source.emit = function () {
    exports.emit.apply(exports, arguments);
  };

  exports.addChangeListener = function (callback) {
    exports.on('change', callback);
  };

  exports.removeChangeListener = function (callback) {
    exports.removeListener('change', callback);
  };

  // Register actions
  source.actions.forEach(function (action) {
    if (!action || !action.handlerName) {
      throw new Error('This is not an action ' + action);
    }
    if (!source[action.handlerName]) {
      throw new Error('There is no handler for action: ' + action);
    }
    action.on('trigger', source[action.handlerName].bind(source));
  });

  // Register exports
  Object.keys(source.exports).forEach(function (key) {
    exports[key] = function () {
      return safeDeepClone('[Circular]', [], source.exports[key].apply(state, arguments));
    };
  });

  source.state = state;

  return exports;

};

flux.debug = function () {
  global.React = React;
};

flux.createActions = function () {
  return action.apply(null, arguments);
};

flux.createStore = function (definition) {
  var state = definition.getInitialState ? definition.getInitialState() : {};
  return mergeStore(definition.mixins, definition, state);
};

// If running in global mode, expose $$
if (!global.exports && !global.module && (!global.define || !global.define.amd)) {
  global.flux = flux;
}

module.exports = flux;
