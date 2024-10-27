const {
  codes: { ERR_INVALID_ARG_TYPE, ERR_INVALID_ARG_VALUE, ERR_OUT_OF_RANGE, ERR_SOCKET_BAD_PORT }
} = require('#internal/errors');

const validateType = (value, name, type) => {
  if (typeof value !== type) throw new ERR_INVALID_ARG_TYPE(name, type, value);
};

const validateArray = (value, name) => {
  if (!Array.isArray(value)) throw new ERR_INVALID_ARG_TYPE(name, 'Array', value);
};

const validateStringArray = (value, name) => {
  validateArray(value, name);
  value.forEach((v, i) => validateType(v, `${name}[${i}]`, 'string'));
};

const validateObject = (value, name) => {
  if (value === null || Array.isArray(value) || typeof value !== 'object') {
    throw new ERR_INVALID_ARG_TYPE(name, 'Object', value);
  }
};

const validateOneOf = (value, name, validValues) => {
  if (!validValues.includes(value)) {
    const allowed = validValues.map(v => (typeof v === 'string' ? `'${v}'` : String(v))).join(', ');
    throw new ERR_INVALID_ARG_VALUE(name, value, `must be one of: ${allowed}`);
  }
};

const validateInteger = (value, name, min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER) => {
  validateType(value, name, 'number');
  if (!Number.isInteger(value)) throw new ERR_OUT_OF_RANGE(name, 'an integer', value);
  if (value < min || value > max) throw new ERR_OUT_OF_RANGE(name, `>= ${min} && <= ${max}`, value);
};

const validateUint32 = (value, name, positive = false) => {
  validateInteger(value, name, positive ? 1 : 0, 2 ** 32 - 1);
};

const validateNumber = (value, name, min, max) => {
  validateType(value, name, 'number');
  if ((min !== undefined && value < min) || (max !== undefined && value > max) || Number.isNaN(value)) {
    throw new ERR_OUT_OF_RANGE(
      name,
      `${min !== undefined ? `>= ${min}` : ''}${min !== undefined && max !== undefined ? ' && ' : ''}${max !== undefined ? `<= ${max}` : ''}`,
      value
    );
  }
};

const validatePort = (port, name = 'Port', allowZero = true) => {
  if ((typeof port !== 'number' && typeof port !== 'string') ||
      (typeof port === 'string' && port.trim().length === 0) ||
      +port !== (+port >>> 0) ||
      port > 0xFFFF ||
      (port === 0 && !allowZero)) {
    throw new ERR_SOCKET_BAD_PORT(name, port, allowZero);
  }
  return port | 0;
};

const validateAbortSignal = (signal, name) => {
  if (signal !== undefined &&
      (signal === null ||
       typeof signal !== 'object' ||
       !('aborted' in signal))) {
    throw new ERR_INVALID_ARG_TYPE(name, 'AbortSignal', signal);
  }
};

module.exports = {
  validateArray,
  validateBoolean: (value, name) => validateType(value, name, 'boolean'),
  validateFunction: (value, name) => validateType(value, name, 'function'),
  validateString: (value, name) => validateType(value, name, 'string'),
  validateObject,
  validateOneOf,
  validateInteger,
  validateUint32,
  validateNumber,
  validateStringArray,
  validateAbortSignal,
  validatePort,
};
