// test_pdfparse.js - test pdfjs extraction (robust loader)
const fs = require('fs');

function loadPdfjs() {
  const tries = [
    'pdfjs-dist/legacy/build/pdf.js',
    'pdfjs-dist/build/pdf.js',
    'pdfjs-dist'
  ];

  for (const p of tries) {
    try {
      // eslint-disable-next-line global-require, import/no-dynamic-require
      const lib = require(p);
      if (lib && typeof lib.getDocument === 'function') return lib;
      if (lib && lib.default && typeof lib.default.getDocument === 'function') return lib.default;
    } catch (e) {
      // ignore
    }
  }
  throw new Error('Could not load pdfjs-dist. Please ensure pdfjs-dist is installed.');
}

const pdfjs = loadPdfjs();

async function extractTextFromPdfBuffer(buffer) {
  const loadingTask = pdfjs.getDocument({ data: buffer });
  const doc = await loadingTask.promise;
  const numPages = doc.numPages || 0;
  let fullText = '';

  for (let i = 1; i <= numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const strings = content.items.map(item => (item.str || '')).join(' ');
    fullText += strings + '\n';
  }

  return { text: fullText, numpages: numPages };
}

async function test(filePath) {
  try {
    console.log('Testing file:', filePath);
    if (!filePath) {
      console.error('No file path provided as argument.');
      process.exit(1);
    }
    if (!fs.existsSync(filePath)) {
      console.error('File does not exist:', filePath);
      process.exit(1);
    }

    const buffer = fs.readFileSync(filePath);
    const data = await extractTextFromPdfBuffer(buffer);

    console.log('numpages:', data.numpages);
    const text = data.text || '';
    console.log('extracted text length:', text.length);
    console.log('first 800 chars:\n---\n' + (text.slice(0, 800) || '(no text)') + '\n---');
  } catch (err) {
    console.error('ERROR parsing PDF:', err && err.stack ? err.stack : err);
  }
}

const arg = process.argv[2];
test(arg);
