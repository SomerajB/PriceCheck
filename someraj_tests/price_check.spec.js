// @ts-check
const { test, expect } = require('@playwright/test');

test('check price change for iphone 15', async ({ page }) => {
  await page.goto('https://www.jbhifi.com.au/');

  
  // await page.waitForTimeout(10000)

  await page.getByRole('button', { name: 'Products' }).click();
  await page.getByRole('menuitem', { name: 'Mobile Phones' }).click();
  await page.getByRole('menuitem', { name: 'Apple iPhone' }).click();
  await page.getByRole('menuitem', { name: 'iPhone 15 series' }).click();
  await page.getByRole('link', { name: 'Apple iPhone 15 128GB (Black) iPhone' }).click();
  await page.getByRole('link', { name: 'Apple iPhone 15 128GB (Black) Apple iPhone 15 128GB (Black) 4.6 (276)' }).click();
  const present_price = await page.locator('#pdp-price-cta span').last().textContent()
  expect (Number(present_price)).toEqual(1247)
});