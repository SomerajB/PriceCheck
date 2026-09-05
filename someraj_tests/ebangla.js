const { chromium } = require('@playwright/test');
const fs = require('fs');
const https = require('https');
const path = require('path');
const sharp = require('sharp');

// Configuration - you can modify these URLs as needed
const authUrl = '';

// Add your direct book URL here, or leave as null to scrape the author page
const directBookUrl = 'https://www.ebanglalibrary.com/books/%e0%a6%97%e0%a6%be-%e0%a6%9b%e0%a6%ae%e0%a6%9b%e0%a6%ae%e0%a7%87-%e0%a6%ad%e0%a7%8c%e0%a6%a4%e0%a6%bf%e0%a6%95-%e0%a6%85%e0%a6%b2%e0%a7%8c%e0%a6%95%e0%a6%bf%e0%a6%95-%e0%a6%b9%e0%a6%bf%e0%a6%ae/'

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
  // Try multiple selectors to get the image URL
  const imageUrl = await page.evaluate(() => {
    // Try to get from source tag (webp)
    const source = document.querySelector('.entry-image-single source');
    if (source && source.srcset) return source.srcset;
    
    // Try to get from img data-src
    const img = document.querySelector('.entry-image-single img');
    if (img && img.dataset.src) return img.dataset.src;
    
    // Fallback to img src
    if (img && img.src) return img.src;
    
    return null;
  });
  
  if (!imageUrl) {
    throw new Error('No image URL found');
  }
  
  const protocol = imageUrl.startsWith('https') ? https : http;
  
  protocol.get(imageUrl, response => {
    const chunks = [];
    
    response.on('data', chunk => chunks.push(chunk));
    
    response.on('end', async () => {
      try {
        const buffer = Buffer.concat(chunks);
        
        await sharp(buffer)
          .jpeg({ quality: 90 })
          .toFile(`./covers/${safeBookname}.jpg`);
        
        console.log('✅ Cover image saved as JPG!');
      } catch (conversionErr) {
        console.log(`⚠️ Error converting image: ${conversionErr.message}`);
      }
    });
  }).on('error', (err) => {
    console.log(`⚠️ Error downloading: ${err.message}`);
  });
} catch (err) {
  console.log(`⚠️ No cover image for book "${bookname}"`);
}

  // Step 2: Start content scraping
  try {
    //await page.pause()
    await page.locator('.ld-item-list-item-preview').first().click({force: true});
    await page.waitForLoadState('load');

    const chapterLinks = await page.locator('.ld-lesson-item a').all();
    console.log(`Total Chapters : ${chapterLinks.length}`)
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
      const chapterClass = await page.locator('.ld-lesson-items >> a').nth(i).getAttribute('class');

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