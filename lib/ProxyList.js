const fs = require('fs');

const PROXY_FILE_PATH = 'proxy.txt';
const ENCODING = 'utf8';

class ProxyList {
	constructor() {
		this.proxies = fs.readFileSync(PROXY_FILE_PATH, ENCODING).split('\n').map(i => i.trim()).filter(i => i);
		if (this.proxies.length == 0) {
			throw new Error(`Proxy file (${PROXY_FILE_PATH}) is empty`);
		}
	}

	getRandom() {
		return this.proxies[Math.floor(this.proxies.length * Math.random())];
	}

	format(proxyDescriptor) {
		const [
      login,
      password,
      ip,
      port
		] = proxyDescriptor.split(/[@:]/);
    return {
      login,
      password,
      ip,
      port
    }
	}
}

module.exports = ProxyList;