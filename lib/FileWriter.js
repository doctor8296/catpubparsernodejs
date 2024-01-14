
const { HttpsProxyAgent } = require("https-proxy-agent");
const axios = require('axios');
const fs = require('fs');

async function writePDF(name, fileName, path, timeout=0, retryCount, proxy) {
  proxy = proxy ? proxy.getRandom() : null;
  for (let i=0; i<retryCount; i++) {
    try {
      const response = await axios({
        method: 'get',
        url: `https://catpublications.com/previews/${name}.pdf`,
        responseType: 'stream',
        timeout: timeout < 0 ? undefined : timeout,
        httpsAgent: proxy ? new HttpsProxyAgent(proxy) : undefined
      });

      fs.mkdirSync(path, { recursive: true });

      const writer = fs.createWriteStream(`${path}/${fileName}`);
      response.data.pipe(writer);
      await new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
      });
      console.log(`File "${path}/${fileName}" successfuly saved`);
      return `${path}/${fileName}`;
    } catch (error) {
      console.error(`Error "${error.message}" while saving file "${path}/${fileName}"`);
      console.log('Retrying...', i, 1e3 * 2 ** i + 'ms');
      if (error.response && error.response.status === 404) {
        return '-';
      } else {
        await sleep(1e3 * 2 ** i);
      }
    }
  }

  throw new Error(`Cannot request file https://catpublications.com/previews/${name}.pdf}`);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = writePDF;
