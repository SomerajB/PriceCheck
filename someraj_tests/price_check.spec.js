// @ts-check
const { test, expect } = require('@playwright/test');

test('check price change for iphone 15 in JB-HiFi', async ({ page }) => {
  await page.goto('https://www.jbhifi.com.au/products/apple-iphone-15-128gb-black');
  const present_price = await page.locator('#pdp-price-cta span').last().textContent()
  expect (Number(present_price)).toEqual(1247)
});

test('check price change for iphone 15 in OfficeWorks', async ({ page }) => {
  await page.goto('https://www.officeworks.com.au/shop/officeworks/p/iphone-15-128gb-black-ipp15clr1');
  const present_price = await page.locator('span[data-ref$="product-price-isNotRR"] span').innerHTML()
  const price = present_price.split('$')[1]
  expect (Number(price)).toEqual(1247)
});

test('check price change for ipad 10 in JB-HiFi', async ({ page }) => {
  await page.goto('https://www.jbhifi.com.au/products/apple-ipad-10-9-inch-64gb-wi-fi-blue-10th-gen');
  const present_price = await page.locator('#pdp-price-cta span').last().textContent()
  expect (Number(present_price)).toEqual(587)
});

test('check price change for ipad 10 in OfficeWorks', async ({ page }) => {
  await page.goto('https://www.officeworks.com.au/shop/officeworks/p/ipad-10th-gen-10-9-wifi-64gb-blue-ipad10gen1');
  const present_price = await page.locator('span[data-ref$="product-price-isNotRR"] span').innerHTML()
  const price = present_price.split('$')[1]
  expect (Number(price)).toEqual(587)
});