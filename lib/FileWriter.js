
const axios = require('axios');
const HttpsProxyAgent = require("https-proxy-agent");
const fs = require('fs');

async function writePDF(name, fileName, path, timeout=0, retryCount, proxy) {
  proxy = proxy.getRandom();
  for (let i=0; i<retryCount; i++) {
    try {
      const response = await axios({
        method: 'get',
        url: `https://catpublications.com/previews/${name}.pdf`,
        responseType: 'stream',
        timeout: timeout < 0 ? undefined : timeout,
        httpsAgent: proxy ?  new HttpsProxyAgent({
          host: proxy.ip,
          port: Number(proxy.port),
          auth: `${proxy.login}:${proxy.password}`
        }) : undefined,
      });

      fs.mkdirSync(path, { recursive: true });

      const writer = fs.createWriteStream(`${path}/${fileName}`);
      response.data.pipe(writer);
      await new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
      });
    } catch (error) {
      console.error(`Error while saving file "${path}/${fileName}"`);
      console.log('Retrying...', i, 1e3 * 2 ** i + 'ms');
      if (error.response && error.response.status === 404) {
        return '-';
      } else {
        await sleep(1e3 * 2 ** i);
      }
    }

    console.log(`File "${path}" successfuly saved`);
    return `${path}/${fileName}`;
  }

  throw new Error(`Cannot request file https://catpublications.com/previews/${name}.pdf}`);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = writePDF;
