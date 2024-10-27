const util = require('node:util');
const { GetPrimordial } = require('frozen-fruit');
const toBePrimordialized = new Set(Object.getOwnPropertyNames(globalThis));
const arrayLikePromiseFunc = (array, mapFn) => Promise.all(mapFn ? array.map(mapFn) : array);

const primordials = {
  Symbol,
  Number,
  Promise,
  Int32Array,
  Error,
  Proxy,
  Array,
  RegExp,
  EvalError,
  RangeError,
  ReferenceError,
  TypeError,
  SyntaxError,
  URIError,
  String,
  globalThis,
  SafeMap: Map,
  SafeSet: Set,
  PromiseWithResolvers: function () {
    let resolve;
    let reject;
    const promise = new Promise((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  },
  ArrayPrototypePushApply: (self, value) => self.push.apply(self, value),
  ArrayPrototypeUnshiftApply: (self, value) => self.unshift.apply(self, value),
  hardenRegExp: (pattern) => pattern,
  
  SafePromiseAll: arrayLikePromiseFunc,
  SafePromiseAllReturnVoid: arrayLikePromiseFunc,
  SafePromiseAllReturnArrayLike: arrayLikePromiseFunc,
  SafePromisePrototypeFinally: (promise, onFinally) => promise.finally(onFinally),
  SafePromiseAllSettledReturnVoid: (array, mapFn) => Promise.allSettled(mapFn ? array.map(mapFn) : array),
  SafePromiseRace: (array, mapFn) => Promise.race(mapFn ? array.map(mapFn) : array)
};

// Collect primordials from specified global properties
for (const name of toBePrimordialized) {
  if (name[0].toUpperCase() === name[0]) { // Check for capitalized names
    GetPrimordial(globalThis[name], name, primordials);
  }
}

GetPrimordial(Reflect.getPrototypeOf(Uint8Array), 'TypedArray', primordials)

primordials.PromiseResolve = Promise.resolve.bind(Promise);

const proxiedPrimordials = new Proxy(primordials, {
  get(target, prop) {
    // Check if the property exists in the target object
    if (prop in target) {
      return target[prop];  // Return the property value if found
    } else {
      throw new Error(`Key "${prop}" not found in primordials.`);  // Throw an error if not found
    }
  }
});

module.exports = {
  primordials: proxiedPrimordials,
  internalBinding: function (name) {
    switch (name) {
      case 'util': return {
        getCallerLocation: () => {
          const originalPrepareStackTrace = Error.prepareStackTrace;

          // Override Error.prepareStackTrace to customize stack trace formatting
          Error.prepareStackTrace = (_, stack) => stack;

          // Create an error to generate a stack trace
          const stack = new Error().stack;

          // Restore original Error.prepareStackTrace
          Error.prepareStackTrace = originalPrepareStackTrace;

          // Return the second element in the stack trace to get the caller's location
          if (!stack[2]) return [0, 0, '<anonymous>'];
          return [
            stack[2].getLineNumber(),
            stack[2].getColumnNumber(),
            stack[2].getFileName()
          ];
        }
      }
      case 'errors': return {
        exitCodes: {
          kGenericUserError: 1
        }
      }
      case 'types': return {
        isDate: util.types.isDate
      }
      default: throw name
    }
  }
};
