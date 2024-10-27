const { validatePort } = require("#internal/validators");

let debugPortOffset = 1;
function getInspectPort(inspectPort) {
  if (typeof inspectPort === 'function') {
    inspectPort = inspectPort();
  } else if (inspectPort == null) {
    inspectPort = process.debugPort + debugPortOffset;
    if (inspectPort > kMaxPort)
      inspectPort = inspectPort - kMaxPort + kMinPort - 1;
    debugPortOffset++;
  }
  validatePort(inspectPort);

  return inspectPort;
}

const _isUsingInspector = new Map();
const kInspectArgRegex = /--inspect(?:-brk|-port)?|--debug-port/;
function isUsingInspector(execArgv = process.execArgv) {
  if (!_isUsingInspector.has(execArgv)) {
    _isUsingInspector.set(execArgv, execArgv.some((arg) => kInspectArgRegex.exec(arg) !== null) || kInspectArgRegex.exec(process.env.NODE_OPTIONS) !== null);
  }
  return _isUsingInspector.get(execArgv);
}

const kInspectMsgRegex = /Debugger listening on ws:\/\/\[?(.+?)\]?:(\d+)\/|For help, see: https:\/\/nodejs\.org\/en\/docs\/inspector|Debugger attached|Waiting for the debugger to disconnect\.\.\./;
function isInspectorMessage(string) {
    return isUsingInspector() && kInspectMsgRegex.exec(string) !== null;
}

module.exports = {
    getInspectPort,
    isUsingInspector,
    isInspectorMessage,
}