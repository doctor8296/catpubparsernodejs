const fs = require('fs');

const STORAGE_PATH = 'data.json';
const ENCODING = 'utf8';

class Storage {
  constructor() {
    if (!fs.existsSync(STORAGE_PATH)) {
      fs.writeFileSync(STORAGE_PATH, '{}', ENCODING);
    } else {
      const text = fs.readFileSync(STORAGE_PATH, ENCODING);
      if (text.trim() === '') {
        fs.writeFileSync(STORAGE_PATH, '{}', ENCODING);
      }
    }
  }

  get(keys) {
    if (arguments.length === 0) {
      throw new TypeError('Storage.prototype.get() takes 1 arguments but only 0 was provided');
    }
    const output = fs.readFileSync(STORAGE_PATH, ENCODING);
    const data = JSON.parse(output);
    if (keys === null) {
      keys = Object.keys(data);
    }
    if (!Array.isArray(keys)) {
      keys = [String(keys)];
    }
    const object = {};
    for (const key of keys) {
      object[key] = data[key];
    }
    return object;
  }

  set(object) {
    if (arguments.length === 0) {
      throw new TypeError('Storage.prototype.set() takes 1 arguments but only 0 was provided');
    }
    if (typeof object != 'object' || object === null) {
      throw new TypeError('Data is supposed to be not null object');
    }
    const data = this.get(null);
    for (const key in object) {
      data[key] = object[key];
    }
    const text = JSON.stringify(data, null, 2);
    fs.writeFileSync(STORAGE_PATH, text, ENCODING);
    return true;
  }
}

module.exports = Storage;
