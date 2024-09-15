// @ts-check
const { test, expect } = require('@playwright/test');

test('check price change for iphone 15', async ({ page }) => {
  await page.goto('https://www.jbhifi.com.au/products/apple-iphone-15-128gb-black');

  
  // await page.waitForTimeout(10000)

  // await page.getByRole('button', { name: 'Products' }).click();
  // await page.getByRole('menuitem', { name: 'Mobile Phones' }).click();
  // await page.getByRole('menuitem', { name: 'Apple iPhone' }).click();
  // await page.getByRole('menuitem', { name: 'iPhone 15 series' }).click();
  // await page.getByRole('link', { name: 'Apple iPhone 15 128GB (Black) iPhone' }).click();
  // const item = await page.locator('div[data-testid="product-card-title"]').all()
  // for (const i of item){
  //   const prod = await i.textContent()
  //   if (prod == 'Apple iPhone 15 128GB (Black)'){
  //     i.click()
  //     break;
  //   }
  // }
  const present_price = await page.locator('#pdp-price-cta span').last().textContent()
  expect (Number(present_price)).toEqual(1247)
});