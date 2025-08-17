const { test, expect } = require('@playwright/test');
const fs = require('fs').promises;
const fs1 = require('fs');
const path = require('path');
const https = require('https');

// Configuration
const CONFIG = {
    AUTH_FILE: './auth.json',
    BOOKS_DIR: './books',
    CREDENTIALS: {
        email: 'bosesomeraj@gmail.com',
        password: 'Rudi@2021'
    },
    TIMEOUTS: {
        default: 10000,
        navigation: 30000,
        content: 15000
    },
    MAX_RETRIES: 3
};

// Book URLs to scrape
const BOOKS = [
    { url: "https://bengali.pratilipi.com/series/protishodher-khela-by-doyel-kar-fsrmcycoh7x2" }
];

// Utility functions
class Utils {
    static async removeEmojis(text) {
        return text.replace(
            /([\u2700-\u27BF]|[\uE000-\uF8FF]|[\uD83C-\uDBFF\uDC00-\uDFFF]|\uFE0F|\u200D)+/g,
            ''
        ).trim();
    }

    static async ensureDirectory(dir) {
        try {
            await fs.access(dir);
        } catch {
            await fs.mkdir(dir, { recursive: true });
        }
    }

    static sanitizeFilename(filename) {
        return filename.replace(/[<>:"/\\|?*]/g, '_').replace(/\s+/g, '_');
    }

    static generateHtml(bookname, author, content) {
        return `<!DOCTYPE html>
<html lang="bn">
<head>
    <meta charset="utf-8">
    <title>${bookname}</title>
    <meta name="author" content="${author}">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; margin: 40px; }
        .calibre1 { font-size: 1.5em; font-weight: bold; margin: 20px 0; }
        .chapter { margin-bottom: 30px; }
    </style>
</head>
<body>
    <h1>${bookname}</h1>
    <p><em>by ${author}</em></p>
    <hr>
    ${content}
</body>
</html>`;
    }
}

class PratilipiScraper {
    constructor(page) {
        this.page = page;
    }

    async login() {
        console.log('Attempting to log in...');

        await this.page.getByRole('link', { name: 'সাইন ইন সাইন ইন' }).click();
        await this.page.getByRole('textbox', { name: 'ই-মেল' })
            .fill(CONFIG.CREDENTIALS.email);
        await this.page.getByRole('button', { name: 'সাইন ইন ' }).click();

        await this.page.getByRole('textbox', { name: 'পাসওয়ার্ড' })
            .fill(CONFIG.CREDENTIALS.password);
        await this.page.getByRole('button', { name: 'সাইন ইন' }).click();

        // Wait for successful login
        await expect(this.page.getByRole('navigation'))
            .toContainText('প্রোফাইল', { timeout: CONFIG.TIMEOUTS.navigation });

        console.log('Login successful');
    }

    async getBookMetadata() {
        const bookTitle = await this.page.locator('h1.title').textContent();
        const authorName = await this.page.locator('.tw-text-sm.tw-text-black').first().textContent();

        const cleanTitle = await Utils.removeEmojis(bookTitle || '');
        const cleanAuthor = await Utils.removeEmojis(authorName || '');

        return {
            title: cleanTitle,
            author: cleanAuthor,
            filename: Utils.sanitizeFilename(cleanTitle)
        };
    }

    async waitForChapterContent(retryCount = 0) {
        try {
            await Promise.all([
                this.page.locator('.chapter-title').waitFor({ timeout: CONFIG.TIMEOUTS.content }),
                this.page.locator('.content-section>.lh-md').waitFor({ timeout: CONFIG.TIMEOUTS.content })
            ]);
            return true;
        } catch (error) {
            if (retryCount < CONFIG.MAX_RETRIES) {
                console.log(`Content not found, retrying... (${retryCount + 1}/${CONFIG.MAX_RETRIES})`);
                await this.page.reload({ waitUntil: "domcontentloaded" });
                await this.page.waitForTimeout(2000);
                return this.waitForChapterContent(retryCount + 1);
            }
            throw new Error('Failed to load chapter content after retries');
        }
    }

    async hasNextButton(retryCount = 0) {
        try {
            await this.page.locator('button.read-complete-story')
                .waitFor({ timeout: CONFIG.TIMEOUTS.default });
            return true;
        } catch (error) {
            if (retryCount < CONFIG.MAX_RETRIES) {
                console.log(`Next button not found, retrying... (${retryCount + 1}/${CONFIG.MAX_RETRIES})`);
                await this.page.reload({ waitUntil: "domcontentloaded" });
                await this.page.waitForTimeout(2000);
                return this.hasNextButton(retryCount + 1);
            }
            return false;
        }
    }

    async scrapeChapter() {
        const chapterTitle = await this.page.locator('.chapter-title').textContent();
        const chapterContent = await this.page.locator('.content-section>.lh-md').innerHTML();

        return {
            title: (chapterTitle || '').trim(),
            content: chapterContent || ''
        };
    }

    async navigateToFirstChapter() {
        // Ensure page is loaded and scroll to chapters
        await this.page.locator('footer').scrollIntoViewIfNeeded();
        await this.page.waitForTimeout(2000);

        // Click first chapter
        await this.page.locator('.tw-mt-3 h3').first().click();
    }

    async scrapeAllChapters() {
        const chapters = [];
        let chapterNumber = 1;
        let hasNext = true;

        while (hasNext) {
            console.log(`Processing chapter ${chapterNumber}...`);

            // Wait for content to load
            await this.waitForChapterContent();

            // Scrape current chapter
            const chapter = await this.scrapeChapter();
            chapters.push(chapter);

            console.log(`✓ Chapter ${chapterNumber}: ${chapter.title}`);

            // Check for next button and navigate in one atomic operation
            try {
                const nextButton = this.page.locator('button.read-complete-story');
                await nextButton.waitFor({ timeout: CONFIG.TIMEOUTS.default });
                await nextButton.scrollIntoViewIfNeeded();
                await nextButton.click();
                chapterNumber++;
            } catch (error) {
                console.log('Reached last chapter');
                hasNext = false;
            }
        }

        return chapters;
    }
}

// Main test function
BOOKS.forEach(({ url }) => {
    test(`Scraping book: ${url}`, async ({ browser }) => {
        let context;
        let page;

        try {
            // Ensure books directory exists
            await Utils.ensureDirectory(CONFIG.BOOKS_DIR);

            // Try to use existing auth state
            try {
                await fs.access(CONFIG.AUTH_FILE);
                context = await browser.newContext({
                    storageState: CONFIG.AUTH_FILE,
                    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                });
                page = await context.newPage();
                await page.goto(url, { waitUntil: 'domcontentloaded' });

                // Verify login state
                await expect(page.getByRole('navigation'))
                    .toContainText('প্রোফাইল', { timeout: 10000 });

                console.log('Using existing authentication');
            } catch (error) {
                console.log('Authentication failed, logging in fresh...');

                if (context) await context.close();

                context = await browser.newContext({
                    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                });
                page = await context.newPage();
                await page.goto(url, { waitUntil: 'domcontentloaded' });

                const scraper = new PratilipiScraper(page);
                await scraper.login();

                // Save auth state
                await page.context().storageState({ path: CONFIG.AUTH_FILE });
                await page.goto(url, { waitUntil: 'domcontentloaded' });
            }

            const scraper = new PratilipiScraper(page);

            // Get book metadata
            const metadata = await scraper.getBookMetadata();
            console.log(`\n📚 Book: ${metadata.title}`);
            console.log(`✍️  Author: ${metadata.author}`);

            // Download cover image
            try {
                const imageUrl = await page.$eval('.image-container img', img => img.src);
                const file = fs1.createWriteStream(`./covers/${metadata.title}.jpg`);
                https.get(imageUrl, response => {
                    response.pipe(file);
                    file.on('finish', () => {
                        file.close();
                        console.log('✅ Cover image saved!');
                    });
                });
            } catch (err) {
                throw(err)
                console.log(`⚠️ No cover image for book "${metadata.title}"`);
            }

            // Navigate to first chapter
            await scraper.navigateToFirstChapter();

            // Scrape all chapters
            const chapters = await scraper.scrapeAllChapters();

            // Generate content
            const content = chapters.map(chapter =>
                `<div class="chapter">
                    <h1 class="calibre1">${chapter.title}</h1>
                    ${chapter.content}
                </div>`
            ).join('\n');

            // Generate final HTML
            const finalHtml = Utils.generateHtml(metadata.title, metadata.author, content);

            // Save file
            const filePath = path.join(CONFIG.BOOKS_DIR, `${metadata.filename}.html`);
            await fs.writeFile(filePath, finalHtml, 'utf-8');

            console.log(`\n✅ Book saved successfully!`);
            console.log(`📁 File: ${filePath}`);
            console.log(`📄 Chapters: ${chapters.length}`);

        } catch (error) {
            console.error(`❌ Error scraping book: ${error.message}`);
            throw error;
        } finally {
            if (context) await context.close();
        }
    });
});