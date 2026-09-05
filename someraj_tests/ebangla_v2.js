const { chromium } = require('@playwright/test');
const fs = require('fs');
const https = require('https');
const http = require('http'); // FIX: was referenced but never required
const path = require('path');
const sharp = require('sharp');

// Configuration - you can modify these URLs as needed
const authUrl = '';

// Add your direct book URL here, or leave as null to scrape the author page
const directBookUrl = 'https://www.ebanglalibrary.com/lessons/%e0%a6%b0%e0%a6%95%e0%a7%8d%e0%a6%a4%e0%a6%9a%e0%a7%8b%e0%a6%b7%e0%a6%be-%e0%a6%85%e0%a6%9c%e0%a7%87%e0%a6%af%e0%a6%bc-%e0%a6%b0%e0%a6%be%e0%a6%af%e0%a6%bc/';

function sanitizeFileName(name) {
  return name.replace(/[\/\\?%*:|"<>]/g, '_');
}

function downloadCoverImage(imageUrl, safeBookname) {
  return new Promise((resolve) => {
    try {
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
          resolve();
        });
      }).on('error', (err) => {
        console.log(`⚠️ Error downloading: ${err.message}`);
        resolve();
      });
    } catch (err) {
      console.log(`⚠️ No cover image download attempted: ${err.message}`);
      resolve();
    }
  });
}

async function processBook(page, bookUrl) {
  await page.goto(bookUrl, { waitUntil: "networkidle" });

  let bookname = (await page.locator('h1.page-header-title').textContent()).trim();
  const safeBookname = sanitizeFileName(bookname);
  console.log(`\n📘 Scanning book: ${bookname}`);

  // Step 1: Download cover image
  try {
    const imageUrl = await page.evaluate(() => {
      const source = document.querySelector('.entry-image-single source');
      if (source && source.srcset) return source.srcset;

      const img = document.querySelector('.entry-image-single img');
      if (img && img.dataset.src) return img.dataset.src;
      if (img && img.src) return img.src;

      return null;
    });

    if (!imageUrl) {
      throw new Error('No image URL found');
    }

    await downloadCoverImage(imageUrl, safeBookname);
  } catch (err) {
    console.log(`⚠️ No cover image for book "${bookname}": ${err.message}`);
  }

  // Step 2: Collect ALL chapter URLs first (walk pagination on the curriculum page only)
  try {
    await page.locator('.ld-item-list-item-preview').first().click({ force: true });
    await page.waitForLoadState("networkidle");

    const pageDetails = await page.locator('.ld-pagination').getAttribute('data-pager-results');
    const totalChapters = Number(pageDetails.split('total_items":')[1].split(',')[0]);
    console.log(`Total Chapters : ${totalChapters}`);

    // Dedup incrementally as we go — the loop must keep paginating until the
    // UNIQUE set reaches totalChapters, not the raw (possibly duplicate-laden) array.
    const seen = new Set();
    const uniqueChapters = []; // { url, isTable }
    let stagnantPages = 0; // safety valve: how many consecutive pages added 0 new unique items
    const MAX_STAGNANT_PAGES = 3;

    while (uniqueChapters.length < totalChapters) {
      await page.locator('.ld-lesson-item a').first().waitFor();

      const items = await page.locator('.ld-lesson-item a').all();
      let newOnThisPage = 0;
      for (const item of items) {
        const href = await item.getAttribute('href');
        const cls = await item.getAttribute('class');
        const itemText = (await item.textContent())?.trim();

        if (!href) continue;

        if (seen.has(href)) {
          // DEBUG: log what got dropped so we can tell real dupes from false matches
          console.log(`   ↳ SKIPPED as duplicate href: "${itemText}" [class="${cls}"] → ${href}`);
          continue;
        }

        seen.add(href);
        uniqueChapters.push({ url: href, isTable: cls?.includes('table') ?? false, title: itemText });
        newOnThisPage++;
      }
      console.log(`Collected ${uniqueChapters.length}/${totalChapters} unique chapter links so far (+${newOnThisPage} this page)`);

      if (uniqueChapters.length >= totalChapters) break;

      // If a page contributes zero new unique chapters, pagination may be stuck
      // re-rendering the same content — guard against an infinite loop.
      if (newOnThisPage === 0) {
        stagnantPages++;
        console.log(`⚠️ No new unique chapters found on this page (${stagnantPages}/${MAX_STAGNANT_PAGES} stagnant)`);
        if (stagnantPages >= MAX_STAGNANT_PAGES) {
          console.log('⚠️ Too many stagnant pages in a row — stopping pagination to avoid infinite loop');
          break;
        }
      } else {
        stagnantPages = 0;
      }

      const nextBtn = page.locator('.next');
      const nextCount = await nextBtn.count();
      if (nextCount === 0) {
        console.log('⚠️ No .next button found but totalChapters not reached — stopping pagination');
        break;
      }

      const isDisabled = await nextBtn.first().evaluate(el =>
        el.classList.contains('disabled') || el.getAttribute('aria-disabled') === 'true'
      ).catch(() => false);
      if (isDisabled) {
        console.log('⚠️ .next is disabled — this is the last page');
        break;
      }

      const beforeCount = await page.locator('.ld-lesson-item a').count();
      await nextBtn.first().click();

      try {
        await page.waitForLoadState('domcontentloaded', { timeout: 15000 });
        await page.waitForFunction(
          (prevCount) => {
            const els = document.querySelectorAll('.ld-lesson-item a');
            return els.length !== prevCount || els.length > 0;
          },
          beforeCount,
          { timeout: 15000 }
        );
      } catch (e) {
        console.log(`⚠️ Pagination wait failed: ${e.message} — assuming last page reached`);
        break;
      }

      await page.waitForTimeout(1500);
    }

    if (uniqueChapters.length < totalChapters) {
      console.log(`⚠️ WARNING: only collected ${uniqueChapters.length}/${totalChapters} chapters for "${bookname}"`);
    } else {
      console.log(`✅ Collected all ${uniqueChapters.length} unique chapter links`);
    }

    // Step 3: Scrape content for each chapter — decoupled from pagination logic
    const filePath = `./books/${safeBookname}.txt`;
    let content = '';

    for (const [idx, ch] of uniqueChapters.entries()) {
      try {
        await page.goto(ch.url, { waitUntil: "networkidle" });
        await page.waitForTimeout(1000);

        // Remove annoying overlays
        await page.evaluate(() => {
          document.querySelectorAll('.google-anno-skip, button.simplefavorite-button, #ftwp-contents')
            ?.forEach(el => el.remove());
        });

        try {
          await page.locator('.ld-tab-content').first().waitFor();
        } catch { }

        const title = (await page.locator('h1').last().textContent())?.trim();
        content += `${ch.isTable ? 'heading2' : 'heading1'} = ${title}\n\n`;

        const stories = await page.locator('.ld-tab-content').allInnerTexts();
        for (const story of stories) {
          content += story.trim() + "\n\n";
        }

        console.log(`✅ Loaded chapter ${idx + 1}/${uniqueChapters.length}: ${title}`);
      } catch (chapterErr) {
        console.log(`⚠️ Failed to load chapter ${idx + 1} (${ch.url}): ${chapterErr.message}`);
        content += `heading1 = [FAILED TO LOAD: ${ch.url}]\n\n`;
      }
    }

    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`📚 Saved book: ${bookname}`);
  } catch (error) {
    console.error(`❌ Error processing book "${bookname}":`, error);
  }
}

(async () => {
  const browser = await chromium.launch({
    headless: true
  });
  const page = await browser.newPage();

  // Ensure directories exist
  fs.mkdirSync('./covers', { recursive: true });
  fs.mkdirSync('./books', { recursive: true });

  let urls = [];

  if (directBookUrl) {
    console.log(`🎯 Processing direct book URL: ${directBookUrl}`);
    urls.push(directBookUrl);
  } else {
    console.log(`📖 Scraping author page for all books...`);
    await page.goto(authUrl, { waitUntil: "networkidle" });

    const links = await page.locator('.entry-title a').all();
    for (const bk of links) {
      const href = await bk.getAttribute('href');
      if (href) urls.push(href);
    }
    console.log(`Found ${urls.length} books to process`);
  }

  for (const url of urls) {
    await processBook(page, url);
  }

  await browser.close();
  console.log(`\n🎉 Completed processing ${urls.length} book(s)!`);
})();