const util = require('node:util');
const v8 = require('node:v8');

const kIsNodeError = Symbol('kIsNodeError');
const messages = new Map();
const codes = {};

function isErrorStackTraceLimitWritable() {
  return !v8.startupSnapshot.isBuildingSnapshot() &&
    (Object.getOwnPropertyDescriptor(Error, 'stackTraceLimit')?.writable ??
      Object.isExtensible(Error));
}

function inspectWithNoCustomRetry(obj, options) {
  try {
    return util.inspect(obj, options);
  } catch {
    return util.inspect(obj, { ...options, customInspect: false });
  }
}

class SystemError extends Error {
  constructor(key, context) {
    super();
    if (isErrorStackTraceLimitWritable()) Error.stackTraceLimit = 0;

    const prefix = getMessage(key, [], this);
    this.message = `${prefix}: ${context.syscall} returned ${context.code} (${context.message})` +
      (context.path ? ` ${context.path}` : '') +
      (context.dest ? ` => ${context.dest}` : '');

    captureLargerStackTrace(this);

    this.code = key;
    this.name = 'SystemError';
    this.info = context;

    this[kIsNodeError] = true;

    ['errno', 'syscall', 'path', 'dest'].forEach(prop => {
      if (context[prop]) {
        Object.defineProperty(this, prop, {
          get: () => context[prop]?.toString(),
          set: value => context[prop] = value ? Buffer.from(value.toString()) : undefined,
          enumerable: true,
          configurable: true
        });
      }
    });
  }

  toString() {
    return `${this.name} [${this.code}]: ${this.message}`;
  }

  [Symbol.for('nodejs.util.inspect.custom')](recurseTimes, ctx) {
    return util.inspect(this, { ...ctx, getters: true, customInspect: false });
  }
}

function makeSystemErrorWithCode(key) {
  return class extends SystemError {
    constructor(context) {
      super(key, context);
    }
  };
}

function makeNodeErrorWithCode(Base, key) {
  return function NodeError(...args) {
    const error = new Base();
    error.message = getMessage(key, args, error);
    error.code = key;

    Object.defineProperty(error, kIsNodeError, {
      value: true,
      enumerable: false,
      writable: false,
      configurable: true
    });

    error.toString = function () {
      return `${this.name} [${key}]: ${this.message}`;
    };

    captureLargerStackTrace(error);
    return error;
  };
}


function registerError(sym, val, def, ...otherClasses) {
  messages.set(sym, val);
  const errorClass = def === SystemError ? makeSystemErrorWithCode(sym) : makeNodeErrorWithCode(def, sym);
  otherClasses.forEach(clazz => errorClass[clazz.name] = makeNodeErrorWithCode(clazz, sym));
  codes[sym] = errorClass;
}

function getMessage(key, args, err) {
  const msg = messages.get(key);
  return typeof msg === 'function' ? msg.apply(err, [args, err]) : util.format(msg, ...args);
}

const captureLargerStackTrace = function (err) {
  if (isErrorStackTraceLimitWritable()) {
    Error.stackTraceLimit = Infinity;
    Error.captureStackTrace(err);
    Error.stackTraceLimit = Error.stackTraceLimit;
  }
};

function determineSpecificType(value) {
  if (value === null) {
    return 'null';
  } else if (value === undefined) {
    return 'undefined';
  }

  const type = typeof value;

  switch (type) {
    case 'bigint':
      return `type bigint (${value}n)`;
    case 'number':
      if (value === 0) {
        return 1 / value === -Infinity ? 'type number (-0)' : 'type number (0)';
      } else if (value !== value) { // eslint-disable-line no-self-compare
        return 'type number (NaN)';
      } else if (value === Infinity) {
        return 'type number (Infinity)';
      } else if (value === -Infinity) {
        return 'type number (-Infinity)';
      }
      return `type number (${value})`;
    case 'boolean':
      return value ? 'type boolean (true)' : 'type boolean (false)';
    case 'symbol':
      return `type symbol (${String(value)})`;
    case 'function':
      return `function ${value.name}`;
    case 'object':
      if (value.constructor && 'name' in value.constructor) {
        return `an instance of ${value.constructor.name}`;
      }
      return `${util.inspect(value, { depth: -1 })}`;
    case 'string':
      value.length > 28 && (value = `${value.slice(0, 25)}...`);
      if (value.indexOf("'") === -1) {
        return `type string ('${value}')`;
      }
      return `type string (${JSON.stringify(value)})`;
    default:
      value = util.inspect(value, { colors: false });
      if (value.length > 28) {
        value = `${value.slice(0, 25)}...`;
      }

      return `type ${type} (${value})`;
  }
}

class AbortError extends Error {
  constructor(message = 'The operation was aborted', options = undefined) {
    if (options !== undefined && typeof options !== 'object') {
      throw new codes.ERR_INVALID_ARG_TYPE('options', 'Object', options);
    }
    super(message, options);
    this.code = 'ABORT_ERR';
    this.name = 'AbortError';
  }
}

module.exports = { inspectWithNoCustomRetry, kIsNodeError, codes, AbortError };

// Register errors
registerError('ERR_TEST_FAILURE', ([error, failureType], self) => {
  let msg = error?.message ?? error;

  if (typeof msg !== 'string') {
    msg = inspectWithNoCustomRetry(msg);
  }

  self.failureType = failureType;
  self.cause = error;

  return msg;
}, Error);

registerError('ERR_SOURCE_MAP_CORRUPT', "The source map for '%s' does not exist or is corrupt.", Error);
registerError('ERR_SOURCE_MAP_MISSING_SOURCE', "Cannot find '%s' imported from the source map for '%s'", Error);

// Sorted by a rough estimate on most frequently used entries.
const kTypes = [
  'string',
  'function',
  'number',
  'object',
  'Function',
  'Object',
  'boolean',
  'bigint',
  'symbol',
];

function determineSpecificType(value) {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';

  const type = typeof value;

  switch (type) {
    case 'bigint':
      return `type bigint (${value}n)`;
    case 'number':
      if (Object.is(value, -0)) return 'type number (-0)';
      if (Number.isNaN(value)) return 'type number (NaN)';
      if (!isFinite(value)) return `type number (${value})`;
      return `type number (${value})`;
    case 'boolean':
      return `type boolean (${value})`;
    case 'symbol':
      return `type symbol (${value.toString()})`;
    case 'function':
      return `function ${value.name || '(anonymous)'}`;
    case 'string':
      const displayString = value.length > 28 ? `${value.slice(0, 25)}...` : value;
      return `type string ('${displayString}')`;
    case 'object':
      if (value.constructor && value.constructor.name) {
        return `an instance of ${value.constructor.name}`;
      }
      return `an object: ${util.inspect(value, { depth: -1, colors: false })}`;
    default:
      let displayOther = util.inspect(value, { depth: -1, colors: false });
      if (displayOther.length > 28) {
        displayOther = `${displayOther.slice(0, 25)}...`;
      }
      return `type ${type} (${displayOther})`;
  }
}

function formatList(array, type = 'and') {
  if (array.length === 0) return '';
  if (array.length === 1) return array[0];
  if (array.length === 2) return `${array[0]} ${type} ${array[1]}`;

  const lastItem = `${type} ${array[array.length - 1]}`;
  return `${array.slice(0, -1).join(', ')}, ${lastItem}`;
}
const classRegExp = /^[A-Z][a-zA-Z0-9]*$/;

registerError('ERR_INVALID_ARG_TYPE', ([name, expected, actual]) => {
  if (!Array.isArray(expected)) {
    expected = [expected];
  }

  let msg = 'The ';
  if (name.endsWith(' argument')) {
    // For cases like 'first argument'
    msg += `${name} `;
  } else {
    const type = name.includes('.') ? 'property' : 'argument';
    msg += `"${name}" ${type} `;
  }
  msg += 'must be ';

  const types = [];
  const instances = [];
  const other = [];

  for (const value of expected) {
    if (kTypes.includes(value)) {
      types.push(value.toLowerCase())
    } else if (classRegExp.exec(value) !== null) {
      instances.push(value);
    } else {
      other.push(value);
    }
  }

  // Special handle `object` in case other instances are allowed to outline
  // the differences between each other.
  if (instances.length > 0) {
    const pos = types.indexOf('object');
    if (pos !== -1) {
      types.splice(pos, 1);
      instances.push('Object');
    }
  }

  if (types.length > 0) {
    msg += `${types.length > 1 ? 'one of type' : 'of type'} ${formatList(types, 'or')}`;
    if (instances.length > 0 || other.length > 0)
      msg += ' or ';
  }

  if (instances.length > 0) {
    msg += `an instance of ${formatList(instances, 'or')}`;
    if (other.length > 0)
      msg += ' or ';
  }

  if (other.length > 0) {
    if (other.length > 1) {
      msg += `one of ${formatList(other, 'or')}`;
    } else {
      if (other[0].toLowerCase() !== other[0])
        msg += 'an ';
      msg += `${other[0]}`;
    }
  }

  msg += `. Received ${determineSpecificType(actual)}`;

  return msg;
}, TypeError);

registerError('ERR_INVALID_ARG_VALUE', ([name, value, reason = 'is invalid']) => {
  let inspected = util.inspect(value);
  if (inspected.length > 128) {
    inspected = `${inspected.slice(0, 128)}...`;
  }
  const type = name.includes('.') ? 'property' : 'argument';
  return `The ${type} '${name}' ${reason}. Received ${inspected}`;
}, TypeError, RangeError);
registerError('ERR_INVALID_STATE', 'Invalid state: %s', Error, TypeError, RangeError);
registerError('ERR_SOCKET_BAD_PORT', ([name, port, allowZero = true]) => {
  const operator = allowZero ? '>=' : '>';
  return `${name} should be ${operator} 0 and < 65536. Received ${determineSpecificType(port)}.`;
}, RangeError);

function addNumericalSeparator(val) {
  let res = '';
  let i = val.length;
  const start = val[0] === '-' ? 1 : 0;
  for (; i >= start + 4; i -= 3) {
    res = `_${val.slice(i - 3, i)}${res}`;
  }
  return `${val.slice(0, i)}${res}`;
}

registerError('ERR_OUT_OF_RANGE',
  ([str, range, input, replaceDefaultBoolean = false]) => {
    // Set the default message based on the replaceDefaultBoolean flag
    const defaultMessage = `The value of "${str}" is out of range.`;
    let msg = replaceDefaultBoolean ? str : defaultMessage;

    // Determine the received value representation
    let received;
    if (Number.isInteger(input) && Math.abs(input) > 2 ** 32) {
      received = addNumericalSeparator(String(input));
    } else if (typeof input === 'bigint') {
      received = String(input);
      if (Math.abs(input) > 2n ** 32n) {
        received = addNumericalSeparator(received);
      }
      received += 'n'; // Indicate it's a BigInt
    } else {
      received = util.inspect(input);
    }

    // Append the range and received information to the message
    return `${msg} It must be ${range}. Received ${received}`;
  }, RangeError);

registerError('UNSUPPORTED_FEATURE', '%s is not supported by this polyfill. Please upgrade to the latest version of Node.js to make use of this feature', Error);
