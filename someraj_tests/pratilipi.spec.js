const { test, expect } = require('@playwright/test');
const fs = require('fs');


[
    { url: "https://bengali.pratilipi.com/series/protishodher-khela-by-doyel-kar-fsrmcycoh7x2" }
].forEach(({ url }) => {

    test(`creating ebook from pratilipi: ${url}`, async ({ browser }) => {

        let context;
        let page;

        try {
            context = await browser.newContext({ storageState: './auth.json' });
            page = await context.newPage();
            await page.goto(url);
            await expect(page.getByRole('navigation')).toContainText('প্রোফাইল');
        } catch (error) {
            console.log('storage state not found or failed, logging in');

            // Clean up the invalid context if already created
            if (context) await context.close();

            context = await browser.newContext();
            page = await context.newPage()
            await page.goto(url)
            //await page.pause()
            console.log('storage state not found, logging in')
            await page.getByRole('link', { name: 'সাইন ইন সাইন ইন' }).click();
            await page.getByRole('textbox', { name: 'ই-মেল' }).pressSequentially('bosesomeraj@gmail.com');
            await page.waitForTimeout(1000)
            await page.getByRole('button', { name: 'সাইন ইন ' }).click();
            await page.getByRole('textbox', { name: 'পাসওয়ার্ড' }).pressSequentially('Rudi@2021');
            await page.waitForTimeout(1000)
            await page.getByRole('button', { name: 'সাইন ইন' }).click();
            await expect(page.getByRole('navigation')).toContainText('প্রোফাইল');
            await page.waitForLoadState('load')
            await page.context().storageState({ path: './auth.json' })
            await page.goto(url)
        }
        const bookname = await removeEmojis(String(await page.locator('h1.title').textContent()).trim())
        const filePath = `./books/${bookname}.html`
        const author = String(await page.locator('.tw-text-sm.tw-text-black').first().textContent()).trim()

        console.log(`Login success\n\nScanning book ${bookname} written by ${author}`)

        await page.waitForTimeout(2000)
        // Example: Scroll until the bottom
        await page.locator('footer').scrollIntoViewIfNeeded()
        //let scroll = true
        let chapterCount
        // console.log('Searching for chapters....')
        // while (scroll) {
        //     chapterCount = await page.locator('.tw-mt-3').count()
        //     await page.locator('.tw-mt-3').nth(chapterCount - 1).scrollIntoViewIfNeeded()
        //     await page.waitForTimeout(3000)
        //     let chapterCountNew = await page.locator('.tw-mt-3').count()
        //     if (chapterCount == chapterCountNew) {
        //         scroll = false
        //         console.log(`\nFound ${chapterCount} chapters`)
        //     }
        // }

        //let next = true
        let total_content = '', j = 1, next = true

        await page.locator('.tw-mt-3 h3').first().dispatchEvent('click')
        outerLoop: while (next) {

            for (let attempt = 1; attempt <= 4; attempt++) {
                try {
                    await page.locator('.chapter-title').waitFor({ timeout: 5000 })
                    await page.locator('.content-section>.lh-md').waitFor({ timeout: 5000 })
                    break
                }
                catch (error) {
                    if (attempt == 3) {
                        console.log('No content')
                        throw error
                    }
                    await page.reload({ waitUntil: "domcontentloaded" })
                    console.log(`reloading, content not found!...attempt: ${attempt}`)
                }
            }

            const chapterTitle = String(await page.locator('.chapter-title').textContent()).trim()
            const chapterStory = await page.locator('.content-section>.lh-md').innerHTML()
            console.log(`Loading chapter ${j}: ${chapterTitle}`)
            total_content += `<h1 class="calibre1">${chapterTitle}</h1>\n${chapterStory}\n`

            for (let attempt = 1; attempt <= 4; attempt++) {
                try {
                    await page.locator('button.read-complete-story').waitFor({ timeout: 5000 })
                    break
                }
                catch (error) {
                    if (attempt == 3) {
                        console.log('\nLast chapter !')
                        break outerLoop
                    }
                    await page.reload({ waitUntil: "domcontentloaded" })
                    console.log(`reloading, next button not found!....attempt ${attempt}`)
                }
            }
            await page.locator('button.read-complete-story').scrollIntoViewIfNeeded()
            await page.locator('button.read-complete-story').dispatchEvent('click')
            j++
        }

        const finalHtml = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="utf-8">
            <title>${bookname}</title>
            <meta name="author" content="${author}">
        </head>
        <body>
            ${total_content}
        </body>
        </html>
      `;

        fs.writeFileSync(filePath, finalHtml, 'utf-8');

        console.log('\nBook saved successfully!\n')
        await context.close()
    })

})

async function removeEmojis(text) {
    return await text.replace(
      /([\u2700-\u27BF]|[\uE000-\uF8FF]|[\uD83C-\uDBFF\uDC00-\uDFFF]|\uFE0F|\u200D)+/g,
      ''
    );
  }
  