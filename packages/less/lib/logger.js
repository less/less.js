/**
 * Less logger wired to Jess's logger singleton.
 * Forwards to Jess and maintains Less-style addListener/removeListener for compatibility.
 * @module less/lib/logger
 */

import { logger as jessLogger } from '@jesscss/core';

/** @typedef {{ error?: (msg: string) => void, warn?: (msg: string) => void, info?: (msg: string) => void, debug?: (msg: string) => void }} LogListener */

/** @type {LogListener[]} */
const _listeners = [];

/** @param {'error'|'warn'|'info'|'debug'} type @param {string} msg */
function _fireEvent(type, msg) {
  for (const listener of _listeners) {
    const fn = listener[type];
    if (fn) fn(msg);
  }
}

// Wrap Jess's logger so Less listeners receive Jess's log output
const original = {
  log: jessLogger.log?.bind(jessLogger),
  info: jessLogger.info?.bind(jessLogger),
  warn: jessLogger.warn?.bind(jessLogger),
  error: jessLogger.error?.bind(jessLogger),
};

jessLogger.configure?.({
  log(...args) {
    _fireEvent('debug', args.map(String).join(' '));
    original.log?.(...args);
  },
  info(...args) {
    _fireEvent('info', args.map(String).join(' '));
    original.info?.(...args);
  },
  warn(...args) {
    _fireEvent('warn', args.map(String).join(' '));
    original.warn?.(...args);
  },
  error(...args) {
    _fireEvent('error', args.map(String).join(' '));
    original.error?.(...args);
  },
});

/** Less-compatible logger backed by Jess's singleton */
const logger = {
  /** @param {string} msg */
  error(msg) {
    _fireEvent('error', msg);
    original.error?.(msg);
  },

  /** @param {string} msg */
  warn(msg) {
    _fireEvent('warn', msg);
    original.warn?.(msg);
  },

  /** @param {string} msg */
  info(msg) {
    _fireEvent('info', msg);
    original.info?.(msg);
  },

  /** @param {string} msg */
  debug(msg) {
    _fireEvent('debug', msg);
    original.log?.(msg);
  },

  /** @param {LogListener} listener */
  addListener(listener) {
    _listeners.push(listener);
  },

  /** @param {LogListener} listener */
  removeListener(listener) {
    const i = _listeners.indexOf(listener);
    if (i >= 0) _listeners.splice(i, 1);
  },
};

export { logger };
export default logger;
