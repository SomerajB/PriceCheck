// download-images.js
// Downloads https://online.flipbuilder.com/iagn/gwib/files/page/1.jpg ... 76.jpg
// Usage: node download-images.js

const { request } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://online.pubhtml5.com/hpod/dfic/files/large';
const START = 1;
const END = 56;
const OUTPUT_DIR = path.join(__dirname, 'images');
const DELAY_MS = 300; // small delay between requests to be polite

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Reuses a single context/connection instead of launching a browser per request
  const context = await request.newContext();

  const failed = [];

  for (let i = START; i <= END; i++) {
    const url = `${BASE_URL}/${i}.webp`;
    const outputPath = path.join(OUTPUT_DIR, `${i}.webp`);

    try {
      const response = await context.get(url);

      if (!response.ok()) {
        console.error(`✗ Page ${i}: HTTP ${response.status()}`);
        failed.push(i);
        continue;
      }

      const buffer = await response.body();
      fs.writeFileSync(outputPath, buffer);
      console.log(`✓ Saved ${i}.jpg (${buffer.length} bytes)`);
    } catch (err) {
      console.error(`✗ Page ${i}: ${err.message}`);
      failed.push(i);
    }

    await sleep(DELAY_MS);
  }

  await context.dispose();

  console.log('\nDone.');
  if (failed.length) {
    console.log(`Failed pages: ${failed.join(', ')}`);
  } else {
    console.log('All pages downloaded successfully.');
  }
}

main();