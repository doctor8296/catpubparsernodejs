console.log('catpubparser node.js made by doctor8296');

const Storage = require('./Storage.js');
const Parser = require('./Parser.js');

const RETRY_COUNT = 8;
const TIMEOUT = 0;
const USE_PROXY = true;

const storage = new Storage();

const {
  currentPage,
  formData,
  ended
} = storage.get(['currentPage', 'formData', 'ended']);

if (!formData) {
  throw new Error('No formData found');
}

const parser = new Parser();

(async function() {
  await parser.run(formData, currentPage, ended, RETRY_COUNT, TIMEOUT, USE_PROXY);
  console.log('done');
})();

