console.log('catpubparser node.js made by doctor8296');

const fs = require('fs');
const ExcelJS = require('exceljs');
const Storage = require('./lib/Storage.js');
const Parser = require('./Parser.js');
const writePDF = require('./lib/FileWriter.js');
const generateFileName = require('./generateFileName.js');
const ProxyList = require('./ProxyList.js');

require('dotenv').config();

const RETRY_COUNT = process.env.RETRY_COUNT || 8;
const TIMEOUT = process.env.TIMEOUT || 0;
const USE_PROXY = process.env.USE_PROXY || 0;
const OUTPUT_PATH = process.env.OUTPUT_PATH || './output';

if (!fs.existsSync(OUTPUT_PATH)) {
  fs.mkdirSync(OUTPUT_PATH);
  console.log(`Folder '${OUTPUT_PATH}' created.`);
} else {
  console.log(`Folder '${OUTPUT_PATH}' already exists.`);
}

const storage = new Storage();
const proxy = USE_PROXY ? new ProxyList() : null;

const {
  currentPage,
  formData,
  ended,
  cookie
} = storage.get(['currentPage', 'formData', 'ended']);

if (!formData) {
  throw new Error('No formData found');
}

let { fileName } = storage.get('fileName');
if (!fileName || ended) {
  fileName = generateFileName();
}
storage.set({'fileName': fileName});

const parser = new Parser();
parser.on('update', storage.set.bind(storage));
parser.on('data', async cardsData => {
  const filePath = `${OUTPUT_PATH}/${fileName}`;
  if (!fs.existsSync(filePath)) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Sheet1');
    worksheet.addRow([
      'Filter',
      'Category',
      'Subcategory',
      'Language',
      'Title',
      'Language',
      'Pub Type',
      'Serial Number',
      'Media Number',
      'Version',
      'Book',
      'CD',
      'Download',
      'Path'
    ]);
    await workbook.xlsx.writeFile(filePath);
  }

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const worksheet = workbook.getWorksheet('Sheet1') || workbook.addWorksheet('Sheet1');

  const resultRows = await Promise.all(cardsData.map(async row => {
    // const searchPubType = formData.find(([name, _]) => name === 'SearchPubType');
    const category = formData.find(([name, _]) => name.endsWith('Categories.Index'));
    const subCategory = formData.find(([name, _]) => name.endsWith('.ProductFamilies'));

    const path = [
      OUTPUT_PATH,
      row["Pub Type"],
      row["Language"],
      category && category[1],
      subCategory && subCategory[1]
    ].filter(i => i).join('/');

    const resultPDFPath = await writePDF(row["Media Number"], `${row["Media Number"].replace(/\D+$/g, '')}-${row["Version"]}.pdf`, path, TIMEOUT, 3, proxy);

    return [
      formData.filter(([name, _]) => name === "SearchPubType").map(([name, value]) => value).join('/'), //row["Pub Type"],
      formData.filter(([name, _]) => name === "Categories.Index").map(([name, value]) => value).join('/'), // category ? category[1] : '',
      formData.filter(([name, _]) => name.endsWith("].ProductFamilies")).map(([name, value]) => value).join('/'), // subCategory ? subCategory[1] : '',
      formData.filter(([name, _]) => name === "Languages").map(([name, value]) => value).join('/'),
      row["title"]
      .replace(/.+\(EN-US\)/gi, '')
      .replace(/\([^)]*\)/g, '')
      .replace(/\s-\s.+/g, '')
      .replace(/Parts Manual/gi, '')
      .replace(/Parts Manuals/gi, '')
      .replace(/Operation & Maintenance Manual/gi, '')
      .replace(/Operation & Maintenance/gi, '')
      .replace(/Operation & Preventive Maintenance Manual/gi, '')
      .replace(/Service Manual/gi, '')
      .replace(/Operation & Maintenance Manual/gi, '')
      .replace(/Maintenance Manual/gi, '')
      .replace(new RegExp(`${row["Media Number"]}-${row["Version"]}`,'gi'), '')
      .replace(new RegExp(`${row["Media Number"].replace(/\D+$/g, '')}-${row["Version"]}`,'gi'), '')
      .trim(),
      row["Language"],
      row["Pub Type"],
      row["Serial Number"],
      `${row["Media Number"].replace(/\D+$/g, '')}-${row["Version"]}`,
      row["Version"],
      (row["Book"].match(/\d+/g) || [''])[0],
      (row["CD"].match(/\d+/g) || [''])[0],
      (row["Download"].match(/\d+/g) || [''])[0],
      resultPDFPath
    ]
  }));

  worksheet.addRows(resultRows);

  await workbook.xlsx.writeFile(filePath);

  console.log(cardsData);
});

if (ended) {
  storage.set({'ended': false});
}
parser.run(formData, currentPage, cookie, ended, RETRY_COUNT, TIMEOUT, proxy);

