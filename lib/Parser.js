
const { HttpsProxyAgent } = require("https-proxy-agent");
const axios = require('axios');
const { parse } = require('node-html-parser');
const Eventor = require('./Eventor.js');

class Parser extends Eventor {
  constructor() {
    super();
  }

  async run(formData, startPage, cookie='', ended=false, maxRetryCount=0, timeout=0, proxy=null) {
    let currentPage = ended ? 0 : (startPage ?? 0);
    let totalPages = currentPage + 1;
    let currentRetries = 0;
    while (currentPage < totalPages) {
      const result = await this.getData(
        formData,
        cookie,
        currentPage,
        timeout,
        proxy ? proxy.getRandom() : null
      );

      console.log('Result:', JSON.stringify(Object.assign(Object.assign({}, result), {cardsData: ' [ ...data ]'})));

      if (result.continue) {
        if (!result.totalPages) {
          throw new Error('Something went wrong, page was not found, check formData');
        }

        await this.dispatch('data', result.cardsData);

        totalPages = result.totalPages;
        currentRetries = 0;
        currentPage++;
        this.dispatch('update', {
          currentPage
        });
      } else {
        if (maxRetryCount <= currentRetries) {
          this.dispatch('update', {
            ended: true
          });
          throw new Error('The number of retries has been exceeded.');
        }
        console.log('Retry number:', currentRetries);
        const delay = 1e3 * 2 ** currentRetries;
        console.log(`wating ${delay}ms...`);
        await this.wait(delay);

        // new token & cookie
        const oldToken = formData[0][1];
        console.log('Old token:', oldToken);
        console.log('requesting new token...');
        const { newToken, newCookie } = await this.requestNewToken(timeout, proxy ? proxy.getRandom() : null);
        cookie = newCookie || cookie;
        console.log('New cookie:', newCookie);
        console.log('New token:', newToken);
        formData[0][1] = newToken || oldToken;
        this.dispatch('update', {
          formData,
          cookie
        });
        currentRetries++;
        await this.wait(10e3);
      }
    }
    this.dispatch('update', {
      ended: true
    });
  }

  wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async requestNewToken(timeout, proxy) {
    try {

      const response = await axios.get(
        'https://catpublications.com/',
        {
          timeout: timeout && timeout > -1 ? timeout : undefined,
          httpsAgent: proxy ? new HttpsProxyAgent(proxy) : undefined
        }
      );

      const htmlString = response.data;
      const dom = parse(htmlString);
      return {
        newToken: dom.querySelector('form#searchForm>[name="__RequestVerificationToken"]').attributes.value,
        newCookie: (response.headers['set-cookie'] || [])
        .filter(i => i.includes('__RequestVerificationToken') || i.includes('CartToken'))
        .reduce((pre, cur) => `${pre} ${cur.split(' ')[0]}`, '')
      }

    } catch (error) {
      console.log('Praser.requestNewToken-Error', error.message);
      return  { 
        newToken: null,
        newCookie: null
      };
    }
  }

  async getData(formData, cookie, page, timeout, proxy) {
    console.log('Requesting page...');
    console.log('formData:', JSON.stringify(formData));
    console.log('Timeout:', timeout + 'ms');
    console.log('Proxy:', JSON.stringify(proxy));
    console.log('Page number:', page);

    const body = new URLSearchParams();
    for (const [name, value] of formData) {
      body.append(name, name === 'PageNumber' ? page : value);
    }

    console.log('Body:', body.toString());

    try {
      const config = {
        method: 'post',
        url: 'https://catpublications.com/Search/TokenSearch',
        "headers": {
          "accept": "text/html, */*; q=0.01",
          "accept-language": "en",
          "cache-control": "no-cache",
          "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
          "pragma": "no-cache",
          "sec-ch-ua": "\"Chromium\";v=\"116\", \"Not)A;Brand\";v=\"24\", \"YaBrowser\";v=\"23\"",
          "sec-ch-ua-mobile": "?0",
          "sec-ch-ua-platform": "\"Linux\"",
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin",
          "x-requested-with": "XMLHttpRequest",
          "cookie": cookie,
          "Referer": "https://catpublications.com/en-US/Search/TokenSearch",
          "Referrer-Policy": "strict-origin-when-cross-origin"
        },
        data: body,
      };

      const response = await axios(Object.assign(config, {
        timeout: timeout && timeout > -1 ? timeout : undefined,
        httpsAgent: proxy ? new HttpsProxyAgent(proxy) : undefined
      }));

      console.log('Response status:', response.status);

      if (!(200 <= response.status && response.status <= 204)) {
        return {
          continue: false,
          responseStatus: response.status
        }
      }

      const htmlString = response.data;
      const dom = parse(htmlString);
      const cards = dom.querySelectorAll('#SearchResults .card');
      const cardsData = [...cards].map(card => {
        const languageElement = card.querySelector('td[data-i18n^="resource:SearchFilterLanguage"]');
        const Language = languageElement ? languageElement.textContent : '';
      
        const pubTypeElement = card.querySelector('.table-label:has([data-i18n="resource:MetadataPubType"]) ~ td');
        const PubType = pubTypeElement ? pubTypeElement.textContent : '';
      
        const serialNumberElement = card.querySelector('[data-i18n="resource:MetadataSecondaryTitle"] ~ td');
        const SerialNumber = serialNumberElement ? serialNumberElement.textContent : '';
      
        const mediaNumberElement = card.querySelector('[data-i18n="resource:MetadataProductName"] ~ td');
        const MediaNumber = mediaNumberElement ? mediaNumberElement.textContent : '';
      
        const versionElement = card.querySelector('[data-i18n="resource:MetadataVersion"] ~ td');
        const Version = versionElement ? versionElement.textContent : '';
      
        const bookElement = card.querySelector('.col-xs-3:has([data-i18n="resource:GlobalFormatBook"]) ~ .price-block');
        const Book = bookElement ? bookElement.textContent.trim() : '';
      
        const cdElement = card.querySelector('.col-xs-3:has([data-i18n="resource:GlobalFormatCD"]) ~ .price-block');
        const CD = cdElement ? cdElement.textContent.trim() : '';
      
        const downloadElement = card.querySelector('.col-xs-3:has([data-i18n="resource:GlobalFormatDownload"]) ~ .price-block');
        const Download = downloadElement ? downloadElement.textContent.trim() : '';
      
        const titleElement = card.querySelector('div.card-header');
        const title = titleElement ? titleElement.textContent : '';

        return {
          title,
          Language,
          "Pub Type": PubType,
          "Serial Number": SerialNumber,
          "Media Number": MediaNumber,
          Version,
          Book,
          CD,
          Download
        };
      });

      const pagesDescriptorElement = dom.querySelector('div.row.text-white');
      const [currentPage, totalPages, totalItems] = pagesDescriptorElement ? pagesDescriptorElement.textContent.match(/\d+/g).map(Number) : [];

      return {
        continue: true,
        totalPages,
        cardsData
      }
    } catch (error) {
      return {
        continue: false,
        message: error.message
      }
    }
  }
  
}

module.exports = Parser;