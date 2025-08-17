const { chromium } = require('@playwright/test');
const fs = require('fs');
const https = require('https');
const path = require('path');

// Configuration - you can modify these URLs as needed
const authUrl = 'https://www.ebanglalibrary.com/authors/%E0%A6%85%E0%A6%A6%E0%A7%8D%E0%A6%B0%E0%A7%80%E0%A6%B6-%E0%A6%AC%E0%A6%B0%E0%A7%8D%E0%A6%A7%E0%A6%A8/#google_vignette';

// Add your direct book URL here, or leave as null to scrape the author page
const directBookUrl = 'https://www.ebanglalibrary.com/books/%E0%A6%86%E0%A6%A8%E0%A6%A8%E0%A7%8D%E0%A6%A6%E0%A6%AE%E0%A7%87%E0%A6%B2%E0%A6%BE-%E0%A6%97%E0%A6%B2%E0%A7%8D%E0%A6%AA%E0%A6%B8%E0%A6%82%E0%A6%95%E0%A6%B2%E0%A6%A8-%E0%A6%B8%E0%A6%AE%E0%A7%8D/#google_vignette'

function sanitizeFileName(name) {
  return name.replace(/[\/\\?%*:|"<>]/g, '_');
}

async function processBook(page, bookUrl) {
  await page.goto(bookUrl, { waitUntil: "domcontentloaded" });

  let bookname = (await page.locator('h1.page-header-title').textContent()).trim();
  const safeBookname = sanitizeFileName(bookname);
  console.log(`\n📘 Scanning book: ${bookname}`);

  // Step 1: Download cover image
  try {
    const imageUrl = await page.$eval('.entry-image-single img', img => img.src);
    const file = fs.createWriteStream(`./covers/${safeBookname}.jpg`);
    https.get(imageUrl, response => {
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        console.log('✅ Cover image saved!');
      });
    });
  } catch (err) {
    console.log(`⚠️ No cover image for book "${bookname}"`);
  }

  // Step 2: Start content scraping
  try {
    await page.locator('.ld-item-list-item-preview').first().click();
    await page.waitForLoadState('domcontentloaded');

    const chapterLinks = await page.locator('.ld-lesson-item a').all();
    const filePath = `./books/${safeBookname}.txt`;
    let content = '';

    for (let i = 0; i < chapterLinks.length; i++) {
      const chapterURL = await chapterLinks[i].getAttribute('href');
      if (!chapterURL) continue;

      await page.goto(chapterURL, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(1000);

      // Remove annoying overlays
      await page.evaluate(() => {
        document.querySelectorAll('.google-anno-skip, button.simplefavorite-button, #ftwp-contents')?.forEach(el => el.remove());
      });

      try {
        await page.locator('.ld-tab-content').first().waitFor();
      } catch { }

      const title = (await page.locator('h1').last().textContent())?.trim();
      const chapterClass = await page.locator('.ld-lesson-items >> a').nth(i - 1)?.getAttribute('class') || '';

      if (chapterClass.includes('table')) {
        content += `heading2 = ${title}\n\n`;
      } else {
        content += `heading1 = ${title}\n\n`;
      }

      const stories = await page.locator('.ld-tab-content').allInnerTexts();
      for (const story of stories) {
        content += story.trim() + "\n\n";
      }

      console.log(`✅ Loaded chapter ${i + 1}: ${title}`);
    }

    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`📚 Saved book: ${bookname}`);
  } catch (error) {
    console.error(`❌ Error processing book "${bookname}":`, error);
  }
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Ensure directories exist
  fs.mkdirSync('./covers', { recursive: true });
  fs.mkdirSync('./books', { recursive: true });

  let urls = [];

  if (directBookUrl) {
    // Process single book from direct URL
    console.log(`🎯 Processing direct book URL: ${directBookUrl}`);
    urls.push(directBookUrl);
  } else {
    // Get all book URLs from author page
    console.log(`📖 Scraping author page for all books...`);
    await page.goto(authUrl, { waitUntil: "domcontentloaded" });

    const links = await page.locator('.entry-title a').all();
    for (const bk of links) {
      const href = await bk.getAttribute('href');
      if (href) urls.push(href);
    }
    console.log(`Found ${urls.length} books to process`);
  }

  // Process each book
  for (const url of urls) {
    await processBook(page, url);
  }

  await browser.close();
  console.log(`\n🎉 Completed processing ${urls.length} book(s)!`);
})();