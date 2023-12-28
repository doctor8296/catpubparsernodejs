class Eventor {
  constructor() {
    this._events = new Map();
  }

  on(name, callback) {
    if (!(this._events.has(name))) {
      this._events.set(name, new Set());
    }
    this._events.get(name).add(callback);
  }

  off(name, callback) {
    if (this._events.has(name)) {
      return this._events.get(name).delete(callback);
    }
    return false;
  }

  async dispatch(name, ...args) {
    if (this._events.has(name)) {
      for (const callback of this._events.get(name).values()) {
        if (callback.constructor.name === 'AsyncFunction') {
          await callback(...args)
        } else {
          const result = callback(...args);
          if (result instanceof Promise) {
            await result;
          }
        }
      }
    }
  }
}

module.exports = Eventor;
