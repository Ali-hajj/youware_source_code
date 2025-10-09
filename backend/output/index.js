var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __publicField = (obj, key, value) => {
  __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
  return value;
};

// node_modules/unenv/dist/runtime/_internal/utils.mjs
function createNotImplementedError(name) {
  return new Error(`[unenv] ${name} is not implemented yet!`);
}
__name(createNotImplementedError, "createNotImplementedError");
function notImplemented(name) {
  const fn = /* @__PURE__ */ __name(() => {
    throw createNotImplementedError(name);
  }, "fn");
  return Object.assign(fn, { __unenv__: true });
}
__name(notImplemented, "notImplemented");
function notImplementedClass(name) {
  return class {
    __unenv__ = true;
    constructor() {
      throw new Error(`[unenv] ${name} is not implemented yet!`);
    }
  };
}
__name(notImplementedClass, "notImplementedClass");

// node_modules/unenv/dist/runtime/node/internal/perf_hooks/performance.mjs
var _timeOrigin = globalThis.performance?.timeOrigin ?? Date.now();
var _performanceNow = globalThis.performance?.now ? globalThis.performance.now.bind(globalThis.performance) : () => Date.now() - _timeOrigin;
var nodeTiming = {
  name: "node",
  entryType: "node",
  startTime: 0,
  duration: 0,
  nodeStart: 0,
  v8Start: 0,
  bootstrapComplete: 0,
  environment: 0,
  loopStart: 0,
  loopExit: 0,
  idleTime: 0,
  uvMetricsInfo: {
    loopCount: 0,
    events: 0,
    eventsWaiting: 0
  },
  detail: void 0,
  toJSON() {
    return this;
  }
};
var PerformanceEntry = class {
  __unenv__ = true;
  detail;
  entryType = "event";
  name;
  startTime;
  constructor(name, options) {
    this.name = name;
    this.startTime = options?.startTime || _performanceNow();
    this.detail = options?.detail;
  }
  get duration() {
    return _performanceNow() - this.startTime;
  }
  toJSON() {
    return {
      name: this.name,
      entryType: this.entryType,
      startTime: this.startTime,
      duration: this.duration,
      detail: this.detail
    };
  }
};
__name(PerformanceEntry, "PerformanceEntry");
var PerformanceMark = /* @__PURE__ */ __name(class PerformanceMark2 extends PerformanceEntry {
  entryType = "mark";
  constructor() {
    super(...arguments);
  }
  get duration() {
    return 0;
  }
}, "PerformanceMark");
var PerformanceMeasure = class extends PerformanceEntry {
  entryType = "measure";
};
__name(PerformanceMeasure, "PerformanceMeasure");
var PerformanceResourceTiming = class extends PerformanceEntry {
  entryType = "resource";
  serverTiming = [];
  connectEnd = 0;
  connectStart = 0;
  decodedBodySize = 0;
  domainLookupEnd = 0;
  domainLookupStart = 0;
  encodedBodySize = 0;
  fetchStart = 0;
  initiatorType = "";
  name = "";
  nextHopProtocol = "";
  redirectEnd = 0;
  redirectStart = 0;
  requestStart = 0;
  responseEnd = 0;
  responseStart = 0;
  secureConnectionStart = 0;
  startTime = 0;
  transferSize = 0;
  workerStart = 0;
  responseStatus = 0;
};
__name(PerformanceResourceTiming, "PerformanceResourceTiming");
var PerformanceObserverEntryList = class {
  __unenv__ = true;
  getEntries() {
    return [];
  }
  getEntriesByName(_name, _type) {
    return [];
  }
  getEntriesByType(type) {
    return [];
  }
};
__name(PerformanceObserverEntryList, "PerformanceObserverEntryList");
var Performance = class {
  __unenv__ = true;
  timeOrigin = _timeOrigin;
  eventCounts = /* @__PURE__ */ new Map();
  _entries = [];
  _resourceTimingBufferSize = 0;
  navigation = void 0;
  timing = void 0;
  timerify(_fn, _options) {
    throw createNotImplementedError("Performance.timerify");
  }
  get nodeTiming() {
    return nodeTiming;
  }
  eventLoopUtilization() {
    return {};
  }
  markResourceTiming() {
    return new PerformanceResourceTiming("");
  }
  onresourcetimingbufferfull = null;
  now() {
    if (this.timeOrigin === _timeOrigin) {
      return _performanceNow();
    }
    return Date.now() - this.timeOrigin;
  }
  clearMarks(markName) {
    this._entries = markName ? this._entries.filter((e) => e.name !== markName) : this._entries.filter((e) => e.entryType !== "mark");
  }
  clearMeasures(measureName) {
    this._entries = measureName ? this._entries.filter((e) => e.name !== measureName) : this._entries.filter((e) => e.entryType !== "measure");
  }
  clearResourceTimings() {
    this._entries = this._entries.filter((e) => e.entryType !== "resource" || e.entryType !== "navigation");
  }
  getEntries() {
    return this._entries;
  }
  getEntriesByName(name, type) {
    return this._entries.filter((e) => e.name === name && (!type || e.entryType === type));
  }
  getEntriesByType(type) {
    return this._entries.filter((e) => e.entryType === type);
  }
  mark(name, options) {
    const entry = new PerformanceMark(name, options);
    this._entries.push(entry);
    return entry;
  }
  measure(measureName, startOrMeasureOptions, endMark) {
    let start;
    let end;
    if (typeof startOrMeasureOptions === "string") {
      start = this.getEntriesByName(startOrMeasureOptions, "mark")[0]?.startTime;
      end = this.getEntriesByName(endMark, "mark")[0]?.startTime;
    } else {
      start = Number.parseFloat(startOrMeasureOptions?.start) || this.now();
      end = Number.parseFloat(startOrMeasureOptions?.end) || this.now();
    }
    const entry = new PerformanceMeasure(measureName, {
      startTime: start,
      detail: {
        start,
        end
      }
    });
    this._entries.push(entry);
    return entry;
  }
  setResourceTimingBufferSize(maxSize) {
    this._resourceTimingBufferSize = maxSize;
  }
  addEventListener(type, listener, options) {
    throw createNotImplementedError("Performance.addEventListener");
  }
  removeEventListener(type, listener, options) {
    throw createNotImplementedError("Performance.removeEventListener");
  }
  dispatchEvent(event) {
    throw createNotImplementedError("Performance.dispatchEvent");
  }
  toJSON() {
    return this;
  }
};
__name(Performance, "Performance");
var PerformanceObserver = class {
  __unenv__ = true;
  _callback = null;
  constructor(callback) {
    this._callback = callback;
  }
  takeRecords() {
    return [];
  }
  disconnect() {
    throw createNotImplementedError("PerformanceObserver.disconnect");
  }
  observe(options) {
    throw createNotImplementedError("PerformanceObserver.observe");
  }
  bind(fn) {
    return fn;
  }
  runInAsyncScope(fn, thisArg, ...args) {
    return fn.call(thisArg, ...args);
  }
  asyncId() {
    return 0;
  }
  triggerAsyncId() {
    return 0;
  }
  emitDestroy() {
    return this;
  }
};
__name(PerformanceObserver, "PerformanceObserver");
__publicField(PerformanceObserver, "supportedEntryTypes", []);
var performance = globalThis.performance && "addEventListener" in globalThis.performance ? globalThis.performance : new Performance();

// node_modules/@cloudflare/unenv-preset/dist/runtime/polyfill/performance.mjs
globalThis.performance = performance;
globalThis.Performance = Performance;
globalThis.PerformanceEntry = PerformanceEntry;
globalThis.PerformanceMark = PerformanceMark;
globalThis.PerformanceMeasure = PerformanceMeasure;
globalThis.PerformanceObserver = PerformanceObserver;
globalThis.PerformanceObserverEntryList = PerformanceObserverEntryList;
globalThis.PerformanceResourceTiming = PerformanceResourceTiming;

// node_modules/unenv/dist/runtime/node/console.mjs
import { Writable } from "node:stream";

// node_modules/unenv/dist/runtime/mock/noop.mjs
var noop_default = Object.assign(() => {
}, { __unenv__: true });

// node_modules/unenv/dist/runtime/node/console.mjs
var _console = globalThis.console;
var _ignoreErrors = true;
var _stderr = new Writable();
var _stdout = new Writable();
var log = _console?.log ?? noop_default;
var info = _console?.info ?? log;
var trace = _console?.trace ?? info;
var debug = _console?.debug ?? log;
var table = _console?.table ?? log;
var error = _console?.error ?? log;
var warn = _console?.warn ?? error;
var createTask = _console?.createTask ?? /* @__PURE__ */ notImplemented("console.createTask");
var clear = _console?.clear ?? noop_default;
var count = _console?.count ?? noop_default;
var countReset = _console?.countReset ?? noop_default;
var dir = _console?.dir ?? noop_default;
var dirxml = _console?.dirxml ?? noop_default;
var group = _console?.group ?? noop_default;
var groupEnd = _console?.groupEnd ?? noop_default;
var groupCollapsed = _console?.groupCollapsed ?? noop_default;
var profile = _console?.profile ?? noop_default;
var profileEnd = _console?.profileEnd ?? noop_default;
var time = _console?.time ?? noop_default;
var timeEnd = _console?.timeEnd ?? noop_default;
var timeLog = _console?.timeLog ?? noop_default;
var timeStamp = _console?.timeStamp ?? noop_default;
var Console = _console?.Console ?? /* @__PURE__ */ notImplementedClass("console.Console");
var _times = /* @__PURE__ */ new Map();
var _stdoutErrorHandler = noop_default;
var _stderrErrorHandler = noop_default;

// node_modules/@cloudflare/unenv-preset/dist/runtime/node/console.mjs
var workerdConsole = globalThis["console"];
var {
  assert,
  clear: clear2,
  // @ts-expect-error undocumented public API
  context,
  count: count2,
  countReset: countReset2,
  // @ts-expect-error undocumented public API
  createTask: createTask2,
  debug: debug2,
  dir: dir2,
  dirxml: dirxml2,
  error: error2,
  group: group2,
  groupCollapsed: groupCollapsed2,
  groupEnd: groupEnd2,
  info: info2,
  log: log2,
  profile: profile2,
  profileEnd: profileEnd2,
  table: table2,
  time: time2,
  timeEnd: timeEnd2,
  timeLog: timeLog2,
  timeStamp: timeStamp2,
  trace: trace2,
  warn: warn2
} = workerdConsole;
Object.assign(workerdConsole, {
  Console,
  _ignoreErrors,
  _stderr,
  _stderrErrorHandler,
  _stdout,
  _stdoutErrorHandler,
  _times
});
var console_default = workerdConsole;

// node_modules/wrangler/_virtual_unenv_global_polyfill-@cloudflare-unenv-preset-node-console
globalThis.console = console_default;

// node_modules/unenv/dist/runtime/node/internal/process/hrtime.mjs
var hrtime = /* @__PURE__ */ Object.assign(/* @__PURE__ */ __name(function hrtime2(startTime) {
  const now = Date.now();
  const seconds = Math.trunc(now / 1e3);
  const nanos = now % 1e3 * 1e6;
  if (startTime) {
    let diffSeconds = seconds - startTime[0];
    let diffNanos = nanos - startTime[0];
    if (diffNanos < 0) {
      diffSeconds = diffSeconds - 1;
      diffNanos = 1e9 + diffNanos;
    }
    return [diffSeconds, diffNanos];
  }
  return [seconds, nanos];
}, "hrtime"), { bigint: /* @__PURE__ */ __name(function bigint() {
  return BigInt(Date.now() * 1e6);
}, "bigint") });

// node_modules/unenv/dist/runtime/node/internal/process/process.mjs
import { EventEmitter } from "node:events";

// node_modules/unenv/dist/runtime/node/internal/tty/read-stream.mjs
import { Socket } from "node:net";
var ReadStream = class extends Socket {
  fd;
  constructor(fd) {
    super();
    this.fd = fd;
  }
  isRaw = false;
  setRawMode(mode) {
    this.isRaw = mode;
    return this;
  }
  isTTY = false;
};
__name(ReadStream, "ReadStream");

// node_modules/unenv/dist/runtime/node/internal/tty/write-stream.mjs
import { Socket as Socket2 } from "node:net";
var WriteStream = class extends Socket2 {
  fd;
  constructor(fd) {
    super();
    this.fd = fd;
  }
  clearLine(dir3, callback) {
    callback && callback();
    return false;
  }
  clearScreenDown(callback) {
    callback && callback();
    return false;
  }
  cursorTo(x, y, callback) {
    callback && typeof callback === "function" && callback();
    return false;
  }
  moveCursor(dx, dy, callback) {
    callback && callback();
    return false;
  }
  getColorDepth(env2) {
    return 1;
  }
  hasColors(count3, env2) {
    return false;
  }
  getWindowSize() {
    return [this.columns, this.rows];
  }
  columns = 80;
  rows = 24;
  isTTY = false;
};
__name(WriteStream, "WriteStream");

// node_modules/unenv/dist/runtime/node/internal/process/process.mjs
var Process = class extends EventEmitter {
  env;
  hrtime;
  nextTick;
  constructor(impl) {
    super();
    this.env = impl.env;
    this.hrtime = impl.hrtime;
    this.nextTick = impl.nextTick;
    for (const prop of [...Object.getOwnPropertyNames(Process.prototype), ...Object.getOwnPropertyNames(EventEmitter.prototype)]) {
      const value = this[prop];
      if (typeof value === "function") {
        this[prop] = value.bind(this);
      }
    }
  }
  emitWarning(warning, type, code) {
    console.warn(`${code ? `[${code}] ` : ""}${type ? `${type}: ` : ""}${warning}`);
  }
  emit(...args) {
    return super.emit(...args);
  }
  listeners(eventName) {
    return super.listeners(eventName);
  }
  #stdin;
  #stdout;
  #stderr;
  get stdin() {
    return this.#stdin ??= new ReadStream(0);
  }
  get stdout() {
    return this.#stdout ??= new WriteStream(1);
  }
  get stderr() {
    return this.#stderr ??= new WriteStream(2);
  }
  #cwd = "/";
  chdir(cwd2) {
    this.#cwd = cwd2;
  }
  cwd() {
    return this.#cwd;
  }
  arch = "";
  platform = "";
  argv = [];
  argv0 = "";
  execArgv = [];
  execPath = "";
  title = "";
  pid = 200;
  ppid = 100;
  get version() {
    return "";
  }
  get versions() {
    return {};
  }
  get allowedNodeEnvironmentFlags() {
    return /* @__PURE__ */ new Set();
  }
  get sourceMapsEnabled() {
    return false;
  }
  get debugPort() {
    return 0;
  }
  get throwDeprecation() {
    return false;
  }
  get traceDeprecation() {
    return false;
  }
  get features() {
    return {};
  }
  get release() {
    return {};
  }
  get connected() {
    return false;
  }
  get config() {
    return {};
  }
  get moduleLoadList() {
    return [];
  }
  constrainedMemory() {
    return 0;
  }
  availableMemory() {
    return 0;
  }
  uptime() {
    return 0;
  }
  resourceUsage() {
    return {};
  }
  ref() {
  }
  unref() {
  }
  umask() {
    throw createNotImplementedError("process.umask");
  }
  getBuiltinModule() {
    return void 0;
  }
  getActiveResourcesInfo() {
    throw createNotImplementedError("process.getActiveResourcesInfo");
  }
  exit() {
    throw createNotImplementedError("process.exit");
  }
  reallyExit() {
    throw createNotImplementedError("process.reallyExit");
  }
  kill() {
    throw createNotImplementedError("process.kill");
  }
  abort() {
    throw createNotImplementedError("process.abort");
  }
  dlopen() {
    throw createNotImplementedError("process.dlopen");
  }
  setSourceMapsEnabled() {
    throw createNotImplementedError("process.setSourceMapsEnabled");
  }
  loadEnvFile() {
    throw createNotImplementedError("process.loadEnvFile");
  }
  disconnect() {
    throw createNotImplementedError("process.disconnect");
  }
  cpuUsage() {
    throw createNotImplementedError("process.cpuUsage");
  }
  setUncaughtExceptionCaptureCallback() {
    throw createNotImplementedError("process.setUncaughtExceptionCaptureCallback");
  }
  hasUncaughtExceptionCaptureCallback() {
    throw createNotImplementedError("process.hasUncaughtExceptionCaptureCallback");
  }
  initgroups() {
    throw createNotImplementedError("process.initgroups");
  }
  openStdin() {
    throw createNotImplementedError("process.openStdin");
  }
  assert() {
    throw createNotImplementedError("process.assert");
  }
  binding() {
    throw createNotImplementedError("process.binding");
  }
  permission = { has: /* @__PURE__ */ notImplemented("process.permission.has") };
  report = {
    directory: "",
    filename: "",
    signal: "SIGUSR2",
    compact: false,
    reportOnFatalError: false,
    reportOnSignal: false,
    reportOnUncaughtException: false,
    getReport: /* @__PURE__ */ notImplemented("process.report.getReport"),
    writeReport: /* @__PURE__ */ notImplemented("process.report.writeReport")
  };
  finalization = {
    register: /* @__PURE__ */ notImplemented("process.finalization.register"),
    unregister: /* @__PURE__ */ notImplemented("process.finalization.unregister"),
    registerBeforeExit: /* @__PURE__ */ notImplemented("process.finalization.registerBeforeExit")
  };
  memoryUsage = Object.assign(() => ({
    arrayBuffers: 0,
    rss: 0,
    external: 0,
    heapTotal: 0,
    heapUsed: 0
  }), { rss: () => 0 });
  mainModule = void 0;
  domain = void 0;
  send = void 0;
  exitCode = void 0;
  channel = void 0;
  getegid = void 0;
  geteuid = void 0;
  getgid = void 0;
  getgroups = void 0;
  getuid = void 0;
  setegid = void 0;
  seteuid = void 0;
  setgid = void 0;
  setgroups = void 0;
  setuid = void 0;
  _events = void 0;
  _eventsCount = void 0;
  _exiting = void 0;
  _maxListeners = void 0;
  _debugEnd = void 0;
  _debugProcess = void 0;
  _fatalException = void 0;
  _getActiveHandles = void 0;
  _getActiveRequests = void 0;
  _kill = void 0;
  _preload_modules = void 0;
  _rawDebug = void 0;
  _startProfilerIdleNotifier = void 0;
  _stopProfilerIdleNotifier = void 0;
  _tickCallback = void 0;
  _disconnect = void 0;
  _handleQueue = void 0;
  _pendingMessage = void 0;
  _channel = void 0;
  _send = void 0;
  _linkedBinding = void 0;
};
__name(Process, "Process");

// node_modules/@cloudflare/unenv-preset/dist/runtime/node/process.mjs
var globalProcess = globalThis["process"];
var getBuiltinModule = globalProcess.getBuiltinModule;
var { exit, platform, nextTick } = getBuiltinModule(
  "node:process"
);
var unenvProcess = new Process({
  env: globalProcess.env,
  hrtime,
  nextTick
});
var {
  abort,
  addListener,
  allowedNodeEnvironmentFlags,
  hasUncaughtExceptionCaptureCallback,
  setUncaughtExceptionCaptureCallback,
  loadEnvFile,
  sourceMapsEnabled,
  arch,
  argv,
  argv0,
  chdir,
  config,
  connected,
  constrainedMemory,
  availableMemory,
  cpuUsage,
  cwd,
  debugPort,
  dlopen,
  disconnect,
  emit,
  emitWarning,
  env,
  eventNames,
  execArgv,
  execPath,
  finalization,
  features,
  getActiveResourcesInfo,
  getMaxListeners,
  hrtime: hrtime3,
  kill,
  listeners,
  listenerCount,
  memoryUsage,
  on,
  off,
  once,
  pid,
  ppid,
  prependListener,
  prependOnceListener,
  rawListeners,
  release,
  removeAllListeners,
  removeListener,
  report,
  resourceUsage,
  setMaxListeners,
  setSourceMapsEnabled,
  stderr,
  stdin,
  stdout,
  title,
  throwDeprecation,
  traceDeprecation,
  umask,
  uptime,
  version,
  versions,
  domain,
  initgroups,
  moduleLoadList,
  reallyExit,
  openStdin,
  assert: assert2,
  binding,
  send,
  exitCode,
  channel,
  getegid,
  geteuid,
  getgid,
  getgroups,
  getuid,
  setegid,
  seteuid,
  setgid,
  setgroups,
  setuid,
  permission,
  mainModule,
  _events,
  _eventsCount,
  _exiting,
  _maxListeners,
  _debugEnd,
  _debugProcess,
  _fatalException,
  _getActiveHandles,
  _getActiveRequests,
  _kill,
  _preload_modules,
  _rawDebug,
  _startProfilerIdleNotifier,
  _stopProfilerIdleNotifier,
  _tickCallback,
  _disconnect,
  _handleQueue,
  _pendingMessage,
  _channel,
  _send,
  _linkedBinding
} = unenvProcess;
var _process = {
  abort,
  addListener,
  allowedNodeEnvironmentFlags,
  hasUncaughtExceptionCaptureCallback,
  setUncaughtExceptionCaptureCallback,
  loadEnvFile,
  sourceMapsEnabled,
  arch,
  argv,
  argv0,
  chdir,
  config,
  connected,
  constrainedMemory,
  availableMemory,
  cpuUsage,
  cwd,
  debugPort,
  dlopen,
  disconnect,
  emit,
  emitWarning,
  env,
  eventNames,
  execArgv,
  execPath,
  exit,
  finalization,
  features,
  getBuiltinModule,
  getActiveResourcesInfo,
  getMaxListeners,
  hrtime: hrtime3,
  kill,
  listeners,
  listenerCount,
  memoryUsage,
  nextTick,
  on,
  off,
  once,
  pid,
  platform,
  ppid,
  prependListener,
  prependOnceListener,
  rawListeners,
  release,
  removeAllListeners,
  removeListener,
  report,
  resourceUsage,
  setMaxListeners,
  setSourceMapsEnabled,
  stderr,
  stdin,
  stdout,
  title,
  throwDeprecation,
  traceDeprecation,
  umask,
  uptime,
  version,
  versions,
  // @ts-expect-error old API
  domain,
  initgroups,
  moduleLoadList,
  reallyExit,
  openStdin,
  assert: assert2,
  binding,
  send,
  exitCode,
  channel,
  getegid,
  geteuid,
  getgid,
  getgroups,
  getuid,
  setegid,
  seteuid,
  setgid,
  setgroups,
  setuid,
  permission,
  mainModule,
  _events,
  _eventsCount,
  _exiting,
  _maxListeners,
  _debugEnd,
  _debugProcess,
  _fatalException,
  _getActiveHandles,
  _getActiveRequests,
  _kill,
  _preload_modules,
  _rawDebug,
  _startProfilerIdleNotifier,
  _stopProfilerIdleNotifier,
  _tickCallback,
  _disconnect,
  _handleQueue,
  _pendingMessage,
  _channel,
  _send,
  _linkedBinding
};
var process_default = _process;

// node_modules/wrangler/_virtual_unenv_global_polyfill-@cloudflare-unenv-preset-node-process
globalThis.process = process_default;

// src/index.ts
var corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Project-Id, X-Encrypted-Yw-ID, X-Is-Login, X-Yw-Env"
};
var JSON_HEADERS = {
  "Content-Type": "application/json"
};
var USER_ID_PREFIX = "EVN";
var TOKEN_TTL_MS = 1e3 * 60 * 60 * 12;
var encoder = new TextEncoder();
function corsResponse(response) {
  Object.entries(corsHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}
__name(corsResponse, "corsResponse");
function jsonResponse(status, data) {
  return corsResponse(
    new Response(JSON.stringify(data), {
      status,
      headers: JSON_HEADERS
    })
  );
}
__name(jsonResponse, "jsonResponse");
function badRequest(message) {
  return jsonResponse(400, { error: message });
}
__name(badRequest, "badRequest");
function unauthorized(message = "Unauthorized") {
  return jsonResponse(401, { error: message });
}
__name(unauthorized, "unauthorized");
function forbidden(message = "Forbidden") {
  return jsonResponse(403, { error: message });
}
__name(forbidden, "forbidden");
function notFound(message = "Not Found") {
  return jsonResponse(404, { error: message });
}
__name(notFound, "notFound");
function internalError(error3) {
  console.error("Backend error:", error3);
  return jsonResponse(500, {
    error: "Internal Server Error",
    details: error3 instanceof Error ? error3.message : "Unknown error"
  });
}
__name(internalError, "internalError");
function toHex(bytes) {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}
__name(toHex, "toHex");
function generateSalt() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return toHex(bytes);
}
__name(generateSalt, "generateSalt");
async function hashString(value) {
  const buffer = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return toHex(new Uint8Array(buffer));
}
__name(hashString, "hashString");
async function hashPassword(password, salt) {
  return hashString(`${salt}:${password}`);
}
__name(hashPassword, "hashPassword");
function generateToken() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return toHex(bytes);
}
__name(generateToken, "generateToken");
function normalizeDisplayName(first, last) {
  return [first, last].filter(Boolean).join(" ").trim();
}
__name(normalizeDisplayName, "normalizeDisplayName");
async function cleanupExpiredTokens(env2) {
  const now = Date.now();
  await env2.DB.prepare("DELETE FROM user_tokens WHERE expires_at < ?").bind(now).run();
}
__name(cleanupExpiredTokens, "cleanupExpiredTokens");
async function fetchUserByUsername(env2, projectId2, username) {
  return env2.DB.prepare(
    `SELECT * FROM users WHERE owner_yw_id = ? AND LOWER(username) = LOWER(?) LIMIT 1`
  ).bind(projectId2, username).first();
}
__name(fetchUserByUsername, "fetchUserByUsername");
function mapDbUser(row) {
  return {
    id: row.id,
    username: row.username,
    role: row.role,
    firstName: row.first_name,
    lastName: row.last_name,
    phone: row.phone,
    email: row.email,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    isDefaultAdmin: Boolean(row.is_default_admin),
    ownerYwId: row.owner_yw_id
  };
}
__name(mapDbUser, "mapDbUser");
function serializeUser(user) {
  return {
    id: user.id,
    username: user.username,
    role: user.role,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    email: user.email,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    isDefaultAdmin: user.isDefaultAdmin
  };
}
__name(serializeUser, "serializeUser");
async function getNextUserId(env2, projectId2) {
  const row = await env2.DB.prepare(
    `SELECT id FROM users WHERE owner_yw_id = ? ORDER BY CAST(SUBSTR(id, 4) AS INTEGER) DESC LIMIT 1`
  ).bind(projectId2).first();
  if (!row) {
    return `${USER_ID_PREFIX}001`;
  }
  const numeric = parseInt(row.id.slice(USER_ID_PREFIX.length), 10);
  const nextValue = numeric + 1;
  return `${USER_ID_PREFIX}${nextValue.toString().padStart(3, "0")}`;
}
__name(getNextUserId, "getNextUserId");
function extractBearerToken(request) {
  const header = request.headers.get("Authorization");
  if (!header)
    return null;
  const trimmed = header.trim();
  if (!trimmed.toLowerCase().startsWith("bearer "))
    return null;
  const token = trimmed.slice(7).trim();
  return token || null;
}
__name(extractBearerToken, "extractBearerToken");
async function authenticate(request, env2, projectId2) {
  const token = extractBearerToken(request);
  if (!token) {
    return null;
  }
  const tokenHash = await hashString(token);
  const row = await env2.DB.prepare(
    `SELECT user_id, expires_at FROM user_tokens WHERE token_hash = ? AND owner_yw_id = ? LIMIT 1`
  ).bind(tokenHash, projectId2).first();
  if (!row) {
    return null;
  }
  if (row.expires_at <= Date.now()) {
    await env2.DB.prepare("DELETE FROM user_tokens WHERE token_hash = ?").bind(tokenHash).run();
    return null;
  }
  const userRow = await env2.DB.prepare(
    `SELECT * FROM users WHERE id = ? AND owner_yw_id = ? LIMIT 1`
  ).bind(row.user_id, projectId2).first();
  if (!userRow) {
    await env2.DB.prepare("DELETE FROM user_tokens WHERE token_hash = ?").bind(tokenHash).run();
    return null;
  }
  return {
    user: mapDbUser(userRow),
    tokenHash
  };
}
__name(authenticate, "authenticate");
function mapEventRow(row) {
  const createdBy = {
    userId: row.created_by_user_id,
    displayName: row.created_by_display_name,
    role: row.created_by_role
  };
  const updatedBy = row.updated_by_user_id ? {
    userId: row.updated_by_user_id,
    displayName: row.updated_by_display_name,
    role: row.updated_by_role
  } : void 0;
  return {
    id: row.id,
    title: row.title,
    venue: row.venue,
    venueId: row.venue_id,
    color: row.color,
    date: row.date,
    startTime: row.start_time,
    endTime: row.end_time,
    status: row.status,
    paymentStatus: row.payment_status,
    paymentMethod: row.payment_method,
    contact: {
      name: row.contact_name,
      phone: row.contact_phone,
      email: row.contact_email
    },
    pricing: row.pricing_data ? JSON.parse(row.pricing_data) : void 0,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ownerYwId: row.owner_yw_id,
    createdBy,
    updatedBy
  };
}
__name(mapEventRow, "mapEventRow");
function mapLicenseRow(row) {
  return {
    id: row.id,
    serialNumber: row.serial_number,
    userName: row.user_name,
    planType: row.plan_type,
    startDate: row.start_date,
    expiryDate: row.expiry_date,
    status: row.status,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ownerYwId: row.owner_yw_id
  };
}
__name(mapLicenseRow, "mapLicenseRow");
var LICENSE_PLAN_VALUES = ["monthly", "yearly"];
var LICENSE_STATUS_VALUES = ["active", "expired", "disabled"];
var ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
function isLicensePlanType(value) {
  return LICENSE_PLAN_VALUES.includes(value);
}
__name(isLicensePlanType, "isLicensePlanType");
function isLicenseStatus(value) {
  return LICENSE_STATUS_VALUES.includes(value);
}
__name(isLicenseStatus, "isLicenseStatus");
function parseIsoDateStrict(value) {
  if (!ISO_DATE_REGEX.test(value)) {
    return null;
  }
  const date = /* @__PURE__ */ new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date;
}
__name(parseIsoDateStrict, "parseIsoDateStrict");
function formatIsoDate(date) {
  return date.toISOString().slice(0, 10);
}
__name(formatIsoDate, "formatIsoDate");
function addMonthsUtc(date, months) {
  const result = new Date(date);
  const day = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + months);
  const maxDay = new Date(result.getUTCFullYear(), result.getUTCMonth() + 1, 0).getUTCDate();
  result.setUTCDate(Math.min(day, maxDay));
  return result;
}
__name(addMonthsUtc, "addMonthsUtc");
function sanitizeSerialSegment(input, fallback) {
  if (!input) {
    return fallback;
  }
  const cleaned = input.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return cleaned || fallback;
}
__name(sanitizeSerialSegment, "sanitizeSerialSegment");
function randomAlphaNumeric(length) {
  const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let result = "";
  for (let i = 0; i < length; i++) {
    result += charset[bytes[i] % charset.length];
  }
  return result;
}
__name(randomAlphaNumeric, "randomAlphaNumeric");
async function licenseSerialExists(env2, ownerYwId2, serialNumber) {
  const existing = await env2.DB.prepare(
    `SELECT id FROM licenses WHERE owner_yw_id = ? AND serial_number = ? LIMIT 1`
  ).bind(projectId, serialNumber).first();
  return Boolean(existing);
}
__name(licenseSerialExists, "licenseSerialExists");
async function generateUniqueLicenseSerial(env2, options) {
  const base = sanitizeSerialSegment(options.prefix ?? options.userName, "CLIENT").slice(0, 12);
  const planSegment = options.planType === "yearly" ? "YR" : "MN";
  const dateSegment = formatIsoDate(options.issuedAt).replace(/-/g, "");
  const randomLength = options.randomLength && options.randomLength >= 2 && options.randomLength <= 8 ? Math.floor(options.randomLength) : 4;
  for (let attempt = 0; attempt < 12; attempt++) {
    const serialNumber = `${base}-${planSegment}-${dateSegment}-${randomAlphaNumeric(randomLength)}`;
    if (!await licenseSerialExists(env2, options.ownerYwId, serialNumber)) {
      return serialNumber;
    }
  }
  throw new Error("Failed to generate a unique license serial number");
}
__name(generateUniqueLicenseSerial, "generateUniqueLicenseSerial");
var LicenseInsertError = class extends Error {
  constructor(message, code = "INVALID_DATE") {
    super(message);
    this.code = code;
    this.name = "LicenseInsertError";
  }
};
__name(LicenseInsertError, "LicenseInsertError");
function ensureLicenseDateRange(startDate, expiryDate) {
  const start = parseIsoDateStrict(startDate);
  if (!start) {
    throw new LicenseInsertError("Invalid start date format", "INVALID_DATE");
  }
  const expiry = parseIsoDateStrict(expiryDate);
  if (!expiry) {
    throw new LicenseInsertError("Invalid expiry date format", "INVALID_DATE");
  }
  if (expiry.getTime() < start.getTime()) {
    throw new LicenseInsertError("Expiry date must be after start date", "INVALID_DATE");
  }
}
__name(ensureLicenseDateRange, "ensureLicenseDateRange");
async function insertLicenseRecord(env2, ownerYwId2, input) {
  ensureLicenseDateRange(input.startDate, input.expiryDate);
  const existingSerial = await env2.DB.prepare(
    `SELECT id FROM licenses WHERE owner_yw_id = ? AND serial_number = ? LIMIT 1`
  ).bind(ownerYwId2, input.serialNumber).first();
  if (existingSerial) {
    throw new LicenseInsertError("Serial number already exists", "DUPLICATE_SERIAL");
  }
  const licenseId = crypto.randomUUID();
  const nowIso = (/* @__PURE__ */ new Date()).toISOString();
  try {
    await env2.DB.prepare(
      `INSERT INTO licenses (
        id, serial_number, user_name, plan_type, start_date, expiry_date, status, notes,
        created_at, updated_at, owner_yw_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      licenseId,
      input.serialNumber,
      input.userName,
      input.planType,
      input.startDate,
      input.expiryDate,
      input.status,
      input.notes,
      nowIso,
      nowIso,
      ownerYwId2
    ).run();
  } catch (error3) {
    if (error3 instanceof Error && /UNIQUE constraint failed/i.test(error3.message)) {
      throw new LicenseInsertError("Serial number already exists", "DUPLICATE_SERIAL");
    }
    throw error3;
  }
  const saved = await env2.DB.prepare(
    `SELECT * FROM licenses WHERE id = ? AND owner_yw_id = ? LIMIT 1`
  ).bind(licenseId, ownerYwId2).first();
  if (!saved) {
    throw new Error("Failed to load created license");
  }
  return mapLicenseRow(saved);
}
__name(insertLicenseRecord, "insertLicenseRecord");
async function fetchEventById(env2, projectId2, eventId) {
  const row = await env2.DB.prepare(
    `SELECT * FROM events WHERE id = ? AND owner_yw_id = ? LIMIT 1`
  ).bind(eventId, projectId2).first();
  return row ? mapEventRow(row) : null;
}
__name(fetchEventById, "fetchEventById");
var src_default = {
  async fetch(request, env2) {
    try {
      if (request.method === "OPTIONS") {
        return corsResponse(new Response(null, { status: 204 }));
      }
      const url = new URL(request.url);
      const path = url.pathname;
      const projectId2 = request.headers.get("X-Project-Id");
      const userYwId = request.headers.get("X-Encrypted-Yw-ID");
      if (!projectId2 || !userYwId) {
        return unauthorized("Missing project context headers");
      }
      await cleanupExpiredTokens(env2);
      if (path === "/api/auth/login" && request.method === "POST") {
        const body = await request.json().catch(() => null);
        if (!body || typeof body.username !== "string" || typeof body.password !== "string") {
          return badRequest("Username and password are required");
        }
        const dbUser = await fetchUserByUsername(env2, projectId2, body.username);
        if (!dbUser) {
          return unauthorized("Invalid credentials");
        }
        const expectedHash = await hashPassword(body.password, dbUser.password_salt);
        if (expectedHash !== dbUser.password_hash) {
          return unauthorized("Invalid credentials");
        }
        const user = mapDbUser(dbUser);
        const token = generateToken();
        const tokenHash = await hashString(token);
        const expiresAt = Date.now() + TOKEN_TTL_MS;
        await env2.DB.prepare("DELETE FROM user_tokens WHERE user_id = ? AND owner_yw_id = ?").bind(user.id, projectId2).run();
        await env2.DB.prepare(
          `INSERT INTO user_tokens (token_hash, user_id, expires_at, owner_yw_id) VALUES (?, ?, ?, ?)`
        ).bind(tokenHash, user.id, expiresAt, projectId2).run();
        return jsonResponse(200, {
          token,
          expiresAt,
          user: serializeUser(user)
        });
      }
      if (path === "/api/auth/logout" && request.method === "POST") {
        const auth2 = await authenticate(request, env2, projectId2);
        if (!auth2) {
          return unauthorized();
        }
        await env2.DB.prepare("DELETE FROM user_tokens WHERE token_hash = ?").bind(auth2.tokenHash).run();
        return jsonResponse(200, { success: true });
      }
      if (path === "/api/auth/me" && request.method === "GET") {
        const auth2 = await authenticate(request, env2, projectId2);
        if (!auth2) {
          return unauthorized();
        }
        return jsonResponse(200, { user: serializeUser(auth2.user) });
      }
      const auth = await authenticate(request, env2, projectId2);
      if (!auth) {
        return unauthorized();
      }
      const currentUser = auth.user;
      if (path === "/api/users" && request.method === "GET") {
        if (currentUser.role !== "admin" && currentUser.role !== "manager") {
          return forbidden();
        }
        const { results } = await env2.DB.prepare(
          `SELECT * FROM users WHERE owner_yw_id = ? ORDER BY created_at ASC`
        ).bind(projectId2).all();
        const users = results.map(mapDbUser).map(serializeUser);
        return jsonResponse(200, { users });
      }
      if (path === "/api/users" && request.method === "POST") {
        if (currentUser.role !== "admin" && currentUser.role !== "manager") {
          return forbidden();
        }
        const body = await request.json().catch(() => null);
        if (!body) {
          return badRequest("Invalid payload");
        }
        const {
          username,
          password,
          role,
          firstName,
          lastName,
          phone,
          email
        } = body;
        if (typeof username !== "string" || typeof password !== "string" || typeof role !== "string" || typeof firstName !== "string" || typeof lastName !== "string" || typeof phone !== "string" || typeof email !== "string") {
          return badRequest("Missing required user fields");
        }
        const normalizedRole = role.toLowerCase();
        if (!["admin", "manager", "host", "operator"].includes(normalizedRole)) {
          return badRequest("Invalid role");
        }
        if (currentUser.role === "manager" && (normalizedRole === "admin" || normalizedRole === "manager")) {
          return forbidden("Managers can only create host or operator accounts");
        }
        const existingUser = await fetchUserByUsername(env2, projectId2, username);
        if (existingUser) {
          return badRequest("Username already exists");
        }
        const userId = await getNextUserId(env2, projectId2);
        const salt = generateSalt();
        const passwordHash = await hashPassword(password, salt);
        const nowIso = (/* @__PURE__ */ new Date()).toISOString();
        await env2.DB.prepare(
          `INSERT INTO users (
            id, username, role, first_name, last_name, phone, email,
            password_hash, password_salt, created_at, updated_at, is_default_admin, owner_yw_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`
        ).bind(
          userId,
          username,
          normalizedRole,
          firstName,
          lastName,
          phone,
          email,
          passwordHash,
          salt,
          nowIso,
          nowIso,
          projectId2
        ).run();
        const newUser = await env2.DB.prepare(
          `SELECT * FROM users WHERE id = ? AND owner_yw_id = ? LIMIT 1`
        ).bind(userId, projectId2).first();
        return jsonResponse(201, { user: serializeUser(mapDbUser(newUser)) });
      }
      if (path.startsWith("/api/users/") && request.method === "PUT") {
        const userId = path.split("/")[3];
        if (!userId) {
          return badRequest("User ID is required");
        }
        const targetRow = await env2.DB.prepare(
          `SELECT * FROM users WHERE id = ? AND owner_yw_id = ? LIMIT 1`
        ).bind(userId, projectId2).first();
        if (!targetRow) {
          return notFound("User not found");
        }
        const targetUser = mapDbUser(targetRow);
        if (currentUser.role === "manager") {
          if (targetUser.role === "admin" || targetUser.role === "manager") {
            return forbidden("Managers can only modify host or operator accounts");
          }
        }
        const body = await request.json().catch(() => null);
        if (!body) {
          return badRequest("Invalid payload");
        }
        const {
          firstName = targetUser.firstName,
          lastName = targetUser.lastName,
          phone = targetUser.phone,
          email = targetUser.email,
          role = targetUser.role,
          password
        } = body;
        const normalizedRole = role?.toLowerCase();
        if (normalizedRole && !["admin", "manager", "host", "operator"].includes(normalizedRole)) {
          return badRequest("Invalid role");
        }
        if (targetUser.isDefaultAdmin && normalizedRole && normalizedRole !== "admin") {
          return forbidden("Default admin must remain an admin");
        }
        if (currentUser.role === "manager" && normalizedRole && (normalizedRole === "admin" || normalizedRole === "manager")) {
          return forbidden("Managers cannot promote users to admin or manager");
        }
        const nowIso = (/* @__PURE__ */ new Date()).toISOString();
        let passwordHash = targetRow.password_hash;
        let salt = targetRow.password_salt;
        if (typeof password === "string" && password.length > 0) {
          salt = generateSalt();
          passwordHash = await hashPassword(password, salt);
        }
        await env2.DB.prepare(
          `UPDATE users SET 
            first_name = ?,
            last_name = ?,
            phone = ?,
            email = ?,
            role = ?,
            password_hash = ?,
            password_salt = ?,
            updated_at = ?
          WHERE id = ? AND owner_yw_id = ?`
        ).bind(
          firstName,
          lastName,
          phone,
          email,
          normalizedRole ?? targetUser.role,
          passwordHash,
          salt,
          nowIso,
          targetUser.id,
          projectId2
        ).run();
        const updatedRow = await env2.DB.prepare(
          `SELECT * FROM users WHERE id = ? AND owner_yw_id = ? LIMIT 1`
        ).bind(targetUser.id, projectId2).first();
        return jsonResponse(200, { user: serializeUser(mapDbUser(updatedRow)) });
      }
      if (path.startsWith("/api/users/") && request.method === "DELETE") {
        const userId = path.split("/")[3];
        if (!userId) {
          return badRequest("User ID is required");
        }
        const targetRow = await env2.DB.prepare(
          `SELECT * FROM users WHERE id = ? AND owner_yw_id = ? LIMIT 1`
        ).bind(userId, projectId2).first();
        if (!targetRow) {
          return notFound("User not found");
        }
        const targetUser = mapDbUser(targetRow);
        if (targetUser.isDefaultAdmin) {
          return forbidden("Cannot delete the default admin account");
        }
        if (currentUser.role === "manager") {
          if (targetUser.role === "admin" || targetUser.role === "manager") {
            return forbidden("Managers can only delete host or operator accounts");
          }
        }
        await env2.DB.prepare("DELETE FROM user_tokens WHERE user_id = ? AND owner_yw_id = ?").bind(targetUser.id, projectId2).run();
        await env2.DB.prepare("DELETE FROM users WHERE id = ? AND owner_yw_id = ?").bind(targetUser.id, projectId2).run();
        return jsonResponse(200, { success: true });
      }
      if (path === "/api/events" && request.method === "GET") {
        const { results } = await env2.DB.prepare(
          `SELECT * FROM events
           WHERE owner_yw_id = ?
              OR owner_yw_id IS NULL
           ORDER BY date ASC, start_time ASC`
        ).bind(projectId2).all();
        const events = results.filter((row) => row.owner_yw_id === projectId2 || row.owner_yw_id === null).map((row) => {
          if (!row.owner_yw_id) {
            row.owner_yw_id = projectId2;
          }
          return mapEventRow(row);
        });
        const legacyIds = events.filter((event) => !event.ownerYwId).map((event) => event.id);
        if (legacyIds.length > 0) {
          const placeholders = legacyIds.map(() => "?").join(",");
          await env2.DB.prepare(
            `UPDATE events SET owner_yw_id = ? WHERE id IN (${placeholders})`
          ).bind(projectId2, ...legacyIds).run();
          events.forEach((event) => {
            if (!event.ownerYwId) {
              event.ownerYwId = projectId2;
            }
          });
        }
        return jsonResponse(200, { events });
      }
      if (path === "/api/events" && request.method === "DELETE") {
        if (currentUser.role !== "admin" && currentUser.role !== "manager") {
          return forbidden("Only admin or manager can clear events");
        }
        await env2.DB.prepare("DELETE FROM events WHERE owner_yw_id = ?").bind(projectId2).run();
        return jsonResponse(200, { success: true });
      }
      if (path === "/api/events" && request.method === "POST") {
        const body = await request.json().catch(() => null);
        if (!body) {
          return badRequest("Invalid payload");
        }
        const eventId = typeof body.id === "string" ? body.id : crypto.randomUUID();
        const createdAt = typeof body.createdAt === "string" ? body.createdAt : (/* @__PURE__ */ new Date()).toISOString();
        const updatedAt = typeof body.updatedAt === "string" ? body.updatedAt : createdAt;
        const displayName = normalizeDisplayName(currentUser.firstName, currentUser.lastName);
        const pricingData = body.pricing ? JSON.stringify(body.pricing) : null;
        await env2.DB.prepare(
          `INSERT INTO events (
            id, title, venue, venue_id, color, date, start_time, end_time,
            status, payment_status, payment_method, contact_name, contact_phone,
            contact_email, pricing_data, notes, created_at, updated_at, user_id,
            owner_yw_id,
            created_by_user_id, created_by_display_name, created_by_role,
            updated_by_user_id, updated_by_display_name, updated_by_role
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          eventId,
          body.title,
          body.venue,
          body.venueId ?? body.venue,
          body.color ?? null,
          body.date,
          body.startTime,
          body.endTime,
          body.status,
          body.paymentStatus,
          body.paymentMethod ?? null,
          body.contact?.name,
          body.contact?.phone,
          body.contact?.email,
          pricingData,
          body.notes ?? null,
          createdAt,
          updatedAt,
          currentUser.id,
          projectId2,
          currentUser.id,
          displayName || currentUser.username,
          currentUser.role,
          currentUser.id,
          displayName || currentUser.username,
          currentUser.role
        ).run();
        const savedEvent = await fetchEventById(env2, projectId2, eventId);
        return jsonResponse(201, { event: savedEvent });
      }
      if (path === "/api/events/bulk" && request.method === "POST") {
        const body = await request.json().catch(() => null);
        if (!body || !Array.isArray(body.events)) {
          return badRequest("Invalid payload");
        }
        const displayName = normalizeDisplayName(currentUser.firstName, currentUser.lastName);
        const nowIso = (/* @__PURE__ */ new Date()).toISOString();
        const inserts = body.events.map((incoming) => {
          const eventId = typeof incoming.id === "string" ? incoming.id : crypto.randomUUID();
          const createdAt = typeof incoming.createdAt === "string" ? incoming.createdAt : nowIso;
          const updatedAt = typeof incoming.updatedAt === "string" ? incoming.updatedAt : createdAt;
          const pricingData = incoming.pricing ? JSON.stringify(incoming.pricing) : null;
          return env2.DB.prepare(
            `INSERT INTO events (
              id, title, venue, venue_id, color, date, start_time, end_time,
              status, payment_status, payment_method, contact_name, contact_phone,
              contact_email, pricing_data, notes, created_at, updated_at,
              owner_yw_id,
              created_by_user_id, created_by_display_name, created_by_role,
              updated_by_user_id, updated_by_display_name, updated_by_role
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          ).bind(
            eventId,
            incoming.title,
            incoming.venue,
            incoming.venueId ?? incoming.venue,
            incoming.color ?? null,
            incoming.date,
            incoming.startTime,
            incoming.endTime,
            incoming.status,
            incoming.paymentStatus,
            incoming.paymentMethod ?? null,
            incoming.contact?.name,
            incoming.contact?.phone,
            incoming.contact?.email,
            pricingData,
            incoming.notes ?? null,
            createdAt,
            updatedAt,
            projectId2,
            currentUser.id,
            displayName || currentUser.username,
            currentUser.role,
            currentUser.id,
            displayName || currentUser.username,
            currentUser.role
          );
        });
        await env2.DB.batch(inserts);
        const { results } = await env2.DB.prepare(
          `SELECT * FROM events WHERE owner_yw_id = ? ORDER BY date ASC, start_time ASC`
        ).bind(projectId2).all();
        const events = results.map(mapEventRow);
        return jsonResponse(201, { events });
      }
      if (path.startsWith("/api/events/") && request.method === "PUT") {
        const eventId = path.split("/")[3];
        if (!eventId) {
          return badRequest("Event ID is required");
        }
        const existing = await fetchEventById(env2, projectId2, eventId);
        if (!existing) {
          return notFound("Event not found");
        }
        const body = await request.json().catch(() => null);
        if (!body) {
          return badRequest("Invalid payload");
        }
        const pricingData = body.pricing ? JSON.stringify(body.pricing) : null;
        const displayName = normalizeDisplayName(currentUser.firstName, currentUser.lastName);
        await env2.DB.prepare(
          `UPDATE events SET
            title = ?,
            venue = ?,
            venue_id = ?,
            color = ?,
            date = ?,
            start_time = ?,
            end_time = ?,
            status = ?,
            payment_status = ?,
            payment_method = ?,
            contact_name = ?,
            contact_phone = ?,
            contact_email = ?,
            pricing_data = ?,
            notes = ?,
            updated_at = ?,
            updated_by_user_id = ?,
            updated_by_display_name = ?,
            updated_by_role = ?
          WHERE id = ? AND owner_yw_id = ?`
        ).bind(
          body.title ?? existing.title,
          body.venue ?? existing.venue,
          body.venueId ?? existing.venueId,
          body.color ?? existing.color,
          body.date ?? existing.date,
          body.startTime ?? existing.startTime,
          body.endTime ?? existing.endTime,
          body.status ?? existing.status,
          body.paymentStatus ?? existing.paymentStatus,
          body.paymentMethod ?? existing.paymentMethod,
          body.contact?.name ?? existing.contact.name,
          body.contact?.phone ?? existing.contact.phone,
          body.contact?.email ?? existing.contact.email,
          pricingData,
          body.notes ?? existing.notes,
          (/* @__PURE__ */ new Date()).toISOString(),
          currentUser.id,
          displayName || currentUser.username,
          currentUser.role,
          eventId,
          userYwId
        ).run();
        const updatedEvent = await fetchEventById(env2, projectId2, eventId);
        return jsonResponse(200, { event: updatedEvent });
      }
      if (path.startsWith("/api/events/") && request.method === "DELETE") {
        const eventId = path.split("/")[3];
        if (!eventId) {
          return badRequest("Event ID is required");
        }
        if (currentUser.role !== "admin" && currentUser.role !== "manager") {
          return forbidden("Only admin or manager can delete events");
        }
        const existing = await fetchEventById(env2, projectId2, eventId);
        if (!existing) {
          return notFound("Event not found");
        }
        await env2.DB.prepare("DELETE FROM events WHERE id = ? AND owner_yw_id = ?").bind(eventId, projectId2).run();
        return jsonResponse(200, { success: true });
      }
      if (path === "/api/licenses" && request.method === "GET") {
        if (currentUser.role !== "admin" && currentUser.role !== "manager") {
          return forbidden("Only admin or manager can list licenses");
        }
        const { results } = await env2.DB.prepare(
          `SELECT * FROM licenses WHERE owner_yw_id = ? ORDER BY created_at DESC`
        ).bind(userYwId).all();
        const licenses = results.map(mapLicenseRow);
        return jsonResponse(200, { licenses });
      }
      if (path === "/api/licenses/generate" && request.method === "POST") {
        if (currentUser.role !== "admin") {
          return forbidden("Only admins can generate licenses");
        }
        const body = await request.json().catch(() => null);
        if (!body || typeof body.planType !== "string") {
          return badRequest("planType is required");
        }
        const normalizedPlan = body.planType.toLowerCase();
        if (!isLicensePlanType(normalizedPlan)) {
          return badRequest("Invalid plan type");
        }
        const issuedAt = /* @__PURE__ */ new Date();
        const startDate = typeof body.startDate === "string" ? body.startDate : formatIsoDate(issuedAt);
        const start = parseIsoDateStrict(startDate);
        if (!start) {
          return badRequest("startDate must be in YYYY-MM-DD format");
        }
        const expiryDateInput = typeof body.expiryDate === "string" ? body.expiryDate : null;
        let expiryDate;
        if (expiryDateInput) {
          const parsedExpiry = parseIsoDateStrict(expiryDateInput);
          if (!parsedExpiry) {
            return badRequest("expiryDate must be in YYYY-MM-DD format");
          }
          expiryDate = formatIsoDate(parsedExpiry);
        } else {
          const monthsToAdd = normalizedPlan === "yearly" ? 12 : 1;
          expiryDate = formatIsoDate(addMonthsUtc(start, monthsToAdd));
        }
        const serialNumber = await generateUniqueLicenseSerial(env2, {
          ownerYwId,
          planType: normalizedPlan,
          issuedAt,
          prefix: typeof body.prefix === "string" ? body.prefix : void 0,
          userName: typeof body.userName === "string" ? body.userName : void 0,
          randomLength: typeof body.randomLength === "number" ? body.randomLength : void 0
        });
        const license = await insertLicenseRecord(env2, ownerYwId, {
          serialNumber,
          userName: typeof body.userName === "string" ? body.userName : "Unassigned",
          planType: normalizedPlan,
          startDate: formatIsoDate(start),
          expiryDate,
          status: "active",
          notes: typeof body.notes === "string" ? body.notes : null
        });
        return jsonResponse(201, { license });
      }
      if (path === "/api/licenses/generate" && request.method === "GET") {
        if (currentUser.role !== "admin") {
          return forbidden("Only admins can generate licenses");
        }
        const planType = url.searchParams.get("planType") ?? "monthly";
        if (!isLicensePlanType(planType)) {
          return badRequest("Invalid plan type");
        }
        const issuedAt = /* @__PURE__ */ new Date();
        const serialNumber = await generateUniqueLicenseSerial(env2, {
          ownerYwId,
          planType,
          issuedAt,
          prefix: url.searchParams.get("prefix") ?? void 0,
          userName: url.searchParams.get("userName") ?? void 0,
          randomLength: url.searchParams.get("randomLength") ? Number.parseInt(url.searchParams.get("randomLength") || "", 10) : void 0
        });
        const startDate = formatIsoDate(issuedAt);
        const expiryDate = formatIsoDate(addMonthsUtc(issuedAt, planType === "yearly" ? 12 : 1));
        return jsonResponse(200, {
          serialNumber,
          planType,
          startDate,
          expiryDate,
          preview: true
        });
      }
      if (path === "/api/licenses" && request.method === "POST") {
        if (currentUser.role !== "admin") {
          return forbidden("Only admins can create licenses");
        }
        const body = await request.json().catch(() => null);
        if (!body) {
          return badRequest("Invalid payload");
        }
        const {
          serialNumber,
          userName,
          planType,
          startDate,
          expiryDate,
          status = "active",
          notes = null,
          autoGenerate
        } = body;
        if (autoGenerate) {
          if (typeof planType !== "string") {
            return badRequest("planType is required when autoGenerate=true");
          }
          const normalizedPlan2 = planType.toLowerCase();
          if (!isLicensePlanType(normalizedPlan2)) {
            return badRequest("Invalid plan type");
          }
          const issuedAt = /* @__PURE__ */ new Date();
          const generatedSerial = await generateUniqueLicenseSerial(env2, {
            userYwId,
            planType: normalizedPlan2,
            issuedAt,
            prefix: typeof body.prefix === "string" ? body.prefix : void 0,
            userName: typeof userName === "string" ? userName : void 0,
            randomLength: typeof body.randomLength === "number" ? body.randomLength : void 0
          });
          const effectiveStart = typeof startDate === "string" ? startDate : formatIsoDate(issuedAt);
          const start = parseIsoDateStrict(effectiveStart);
          if (!start) {
            return badRequest("startDate must be in YYYY-MM-DD format");
          }
          const effectiveExpiry = typeof expiryDate === "string" ? expiryDate : formatIsoDate(addMonthsUtc(start, normalizedPlan2 === "yearly" ? 12 : 1));
          try {
            const license = await insertLicenseRecord(env2, ownerYwId, {
              serialNumber: generatedSerial,
              userName: typeof userName === "string" ? userName : "Unassigned",
              planType: normalizedPlan2,
              startDate: formatIsoDate(start),
              expiryDate: effectiveExpiry,
              status: isLicenseStatus(typeof status === "string" ? status.toLowerCase() : "") ? status : "active",
              notes: typeof notes === "string" ? notes : null
            });
            return jsonResponse(201, { license, generated: true });
          } catch (error3) {
            if (error3 instanceof LicenseInsertError) {
              return badRequest(error3.message);
            }
            throw error3;
          }
        }
        if (typeof serialNumber !== "string" || typeof userName !== "string" || typeof planType !== "string" || typeof startDate !== "string" || typeof expiryDate !== "string") {
          return badRequest("Missing required license fields");
        }
        const normalizedPlan = planType.toLowerCase();
        if (!isLicensePlanType(normalizedPlan)) {
          return badRequest("Invalid plan type");
        }
        const normalizedStatus = typeof status === "string" ? status.toLowerCase() : "active";
        if (!isLicenseStatus(normalizedStatus)) {
          return badRequest("Invalid license status");
        }
        try {
          const license = await insertLicenseRecord(env2, ownerYwId, {
            serialNumber,
            userName,
            planType: normalizedPlan,
            startDate,
            expiryDate,
            status: normalizedStatus,
            notes: typeof notes === "string" ? notes : null
          });
          return jsonResponse(201, { license });
        } catch (error3) {
          if (error3 instanceof LicenseInsertError) {
            return badRequest(error3.message);
          }
          throw error3;
        }
      }
      if (path === "/api/licenses/preview-serial" && request.method === "GET") {
        if (currentUser.role !== "admin") {
          return forbidden("Only admins can preview serials");
        }
        const planType = (url.searchParams.get("planType") ?? "monthly").toLowerCase();
        if (!isLicensePlanType(planType)) {
          return badRequest("Invalid plan type");
        }
        const issuedAtParam = url.searchParams.get("issuedAt");
        const issuedAt = issuedAtParam ? new Date(issuedAtParam) : /* @__PURE__ */ new Date();
        if (Number.isNaN(issuedAt.getTime())) {
          return badRequest("issuedAt must be a valid date");
        }
        const serialNumber = await generateUniqueLicenseSerial(env2, {
          ownerYwId,
          planType,
          issuedAt,
          prefix: url.searchParams.get("prefix") ?? void 0,
          userName: url.searchParams.get("userName") ?? void 0,
          randomLength: url.searchParams.get("randomLength") ? Number.parseInt(url.searchParams.get("randomLength") || "", 10) : void 0
        });
        const startDate = url.searchParams.get("startDate") || formatIsoDate(issuedAt);
        let expiryDate;
        const expiryParam = url.searchParams.get("expiryDate");
        if (expiryParam) {
          const parsedExpiry = parseIsoDateStrict(expiryParam);
          if (!parsedExpiry) {
            return badRequest("expiryDate must be in YYYY-MM-DD format");
          }
          expiryDate = formatIsoDate(parsedExpiry);
        } else {
          const parsedStart = parseIsoDateStrict(startDate);
          if (!parsedStart) {
            return badRequest("startDate must be in YYYY-MM-DD format");
          }
          expiryDate = formatIsoDate(addMonthsUtc(parsedStart, planType === "yearly" ? 12 : 1));
        }
        return jsonResponse(200, {
          serialNumber,
          planType,
          startDate,
          expiryDate,
          preview: true
        });
      }
      if (path.startsWith("/api/licenses/") && request.method === "PUT") {
        if (currentUser.role !== "admin") {
          return forbidden("Only admins can modify licenses");
        }
        const licenseId = path.split("/")[3];
        if (!licenseId) {
          return badRequest("License ID is required");
        }
        const existingRow = await env2.DB.prepare(
          `SELECT * FROM licenses WHERE id = ? AND owner_yw_id = ? LIMIT 1`
        ).bind(licenseId, projectId2).first();
        if (!existingRow) {
          return notFound("License not found");
        }
        const body = await request.json().catch(() => null);
        if (!body) {
          return badRequest("Invalid payload");
        }
        const {
          serialNumber = existingRow.serial_number,
          userName = existingRow.user_name,
          planType = existingRow.plan_type,
          startDate = existingRow.start_date,
          expiryDate = existingRow.expiry_date,
          status = existingRow.status,
          notes = existingRow.notes
        } = body;
        const normalizedPlan = planType?.toLowerCase();
        if (normalizedPlan && !["monthly", "yearly"].includes(normalizedPlan)) {
          return badRequest("Invalid plan type");
        }
        const normalizedStatus = status?.toLowerCase();
        if (normalizedStatus && !["active", "expired", "disabled"].includes(normalizedStatus)) {
          return badRequest("Invalid license status");
        }
        if (serialNumber !== existingRow.serial_number) {
          const duplicate = await env2.DB.prepare(
            `SELECT id FROM licenses WHERE owner_yw_id = ? AND serial_number = ? AND id != ? LIMIT 1`
          ).bind(ownerYwId, serialNumber, licenseId).first();
          if (duplicate) {
            return badRequest("Serial number already exists");
          }
        }
        const updateIso = (/* @__PURE__ */ new Date()).toISOString();
        await env2.DB.prepare(
          `UPDATE licenses SET
            serial_number = ?,
            user_name = ?,
            plan_type = ?,
            start_date = ?,
            expiry_date = ?,
            status = ?,
            notes = ?,
            updated_at = ?
          WHERE id = ? AND owner_yw_id = ?`
        ).bind(
          serialNumber,
          userName,
          normalizedPlan ?? existingRow.plan_type,
          startDate,
          expiryDate,
          normalizedStatus ?? existingRow.status,
          notes,
          updateIso,
          licenseId,
          userYwId
        ).run();
        const updated = await env2.DB.prepare(
          `SELECT * FROM licenses WHERE id = ? AND owner_yw_id = ? LIMIT 1`
        ).bind(licenseId, projectId2).first();
        return jsonResponse(200, { license: mapLicenseRow(updated) });
      }
      if (path.startsWith("/api/licenses/") && request.method === "DELETE") {
        if (currentUser.role !== "admin") {
          return forbidden("Only admins can delete licenses");
        }
        const licenseId = path.split("/")[3];
        if (!licenseId) {
          return badRequest("License ID is required");
        }
        const existingRow = await env2.DB.prepare(
          `SELECT id FROM licenses WHERE id = ? AND owner_yw_id = ? LIMIT 1`
        ).bind(licenseId, projectId2).first();
        if (!existingRow) {
          return notFound("License not found");
        }
        await env2.DB.prepare("DELETE FROM licenses WHERE id = ? AND owner_yw_id = ?").bind(licenseId, projectId2).run();
        return jsonResponse(200, { success: true });
      }
      if (path === "/api/licenses/check" && request.method === "POST") {
        const body = await request.json().catch(() => null);
        if (!body || typeof body.serial !== "string") {
          return badRequest("Serial is required");
        }
        const serial = body.serial.trim();
        const licenseRow = await env2.DB.prepare(
          `SELECT * FROM licenses WHERE owner_yw_id = ? AND serial_number = ? LIMIT 1`
        ).bind(ownerYwId, serial).first();
        if (!licenseRow) {
          return jsonResponse(404, {
            valid: false,
            reason: "Invalid serial"
          });
        }
        if (licenseRow.status !== "active") {
          return jsonResponse(403, {
            valid: false,
            reason: "License inactive",
            status: licenseRow.status
          });
        }
        const now = /* @__PURE__ */ new Date();
        const expiry = new Date(licenseRow.expiry_date);
        if (Number.isNaN(expiry.getTime())) {
          return jsonResponse(500, {
            valid: false,
            reason: "Invalid expiry date"
          });
        }
        if (now > expiry) {
          await env2.DB.prepare(
            `UPDATE licenses SET status = 'expired', updated_at = ? WHERE id = ? AND owner_yw_id = ?`
          ).bind((/* @__PURE__ */ new Date()).toISOString(), licenseRow.id, ownerYwId).run();
          return jsonResponse(403, {
            valid: false,
            reason: "License expired",
            expiry: licenseRow.expiry_date
          });
        }
        return jsonResponse(200, {
          valid: true,
          user: licenseRow.user_name,
          expiry: licenseRow.expiry_date,
          plan: licenseRow.plan_type,
          status: licenseRow.status
        });
      }
      if (path === "/api/events/export" && request.method === "GET") {
        const { results } = await env2.DB.prepare(
          `SELECT * FROM events WHERE owner_yw_id = ? ORDER BY date ASC`
        ).bind(projectId2).all();
        const csvHeader = "Title,Venue,Date,Start Time,End Time,Status,Payment Status,Contact Name,Contact Phone,Contact Email,Notes,Created By\n";
        const csvRows = results.map((row) => {
          const fields = [
            row.title,
            row.venue,
            row.date,
            row.start_time,
            row.end_time,
            row.status,
            row.payment_status,
            row.contact_name,
            row.contact_phone,
            row.contact_email,
            row.notes ?? "",
            row.created_by_display_name ?? ""
          ];
          return fields.map((field) => `"${String(field ?? "").replace(/"/g, '""')}"`).join(",");
        }).join("\n");
        const csvContent = csvHeader + csvRows;
        return corsResponse(
          new Response(csvContent, {
            headers: {
              "Content-Type": "text/csv",
              "Content-Disposition": 'attachment; filename="events.csv"'
            }
          })
        );
      }
      return notFound("Endpoint not found");
    } catch (error3) {
      return internalError(error3);
    }
  }
};
export {
  src_default as default
};
//# sourceMappingURL=index.js.map
