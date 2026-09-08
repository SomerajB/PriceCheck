// @ts-check
const { test, expect } = require('@playwright/test');

test('check price change for iphone 17 Pro in JB-HiFi', async ({ page }) => {
  await page.goto('https://www.jbhifi.com.au/products/apple-iphone-17-pro-256gb-cosmic-orange');
  const present_price = await page.locator('#pdp-price-cta span').last().textContent()
  expect (Number(present_price)).toEqual(1699)
});

test('GET Officeworks product price API returns valid data', async ({ request }) => {
  const endpoint = 'https://www.officeworks.com.au/catalogue-app/api/prices/IP17PR25OG';

  // Send the GET request
  const response = await request.get(endpoint, {
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  });
  expect(response.status()).toBe(200);

  // 2. Parse the response body as JSON
  const responseBody = await response.json();
  expect(responseBody.IP17PR25OG.price).toEqual(169900)
  
  
});

test('Check passport status', async ({ request }) => {
  const endpoint = 'https://api2.passportindia.gov.in/v1/mproddc/online/gpsp/trackApplicationStatus';
  const payload = {"requestResponseMap":{"refNo":"26-2002935363","applDob":"01/05/1991"}}

  // Send the GET request
  const response = await request.post(endpoint, {
    data: payload
  });

  expect(response.status()).toBe(200);

  // 2. Parse the response body as JSON
  const responseBody = await response.json();
  expect(responseBody.requestResponseMap.applicationStatus[0].TXT_MSG_KEY).toEqual('Police Verification Report (PVR) awaited')
  
  
});

// test('check price change for iphone 17 Pro in OfficeWorks', async ({ page }) => {
//   await page.goto('https://www.officeworks.com.au/shop/officeworks/p/iphone-17-pro-256gb-cosmic-orange-ip17pr25og', {waitUntil: "domcontentloaded"});
//   const present_price = await page.locator('.sc-hsPFbj.gTdNas.standard.left.lg').first().innerHTML()
//   const price = present_price.split('$')[1]
//   expect (Number(price)).toEqual(1699)
// });

// test.skip('check price change for ipad 10 in JB-HiFi', async ({ page }) => {
//   await page.goto('https://www.jbhifi.com.au/products/apple-ipad-10-9-inch-64gb-wi-fi-blue-10th-gen');
//   const present_price = await page.locator('#pdp-price-cta span').last().textContent()
//   expect (Number(present_price)).toEqual(587)
// });

// test.skip('check price change for ipad 10 in OfficeWorks', async ({ page }) => {
//   await page.goto('https://www.officeworks.com.au/shop/officeworks/p/ipad-10th-gen-10-9-wifi-64gb-blue-ipad10gen1');
//   const present_price = await page.locator('span[data-ref$="product-price-isNotRR"] span').innerHTML()
//   const price = present_price.split('$')[1]
//   expect (Number(price)).toEqual(587)
// });

// test('check price change for iphone 16 in JB-HiFi', async ({ page }) => {
//   await page.goto('https://www.jbhifi.com.au/products/apple-iphone-16-128gb-pink');
//   const present_price = await page.locator('#pdp-price-cta span').last().textContent()
//   expect (Number(present_price)).toEqual(1397)
// });

// test('check price change for iphone 16 in OfficeWorks', async ({ page }) => {
//   await page.goto('https://www.officeworks.com.au/shop/officeworks/p/iphone-16-128gb-pink-ip1624c3');
//   const present_price = await page.locator('span[data-ref$="product-price-isNotRR"] span').innerHTML()
//   const price = present_price.split('$')[1]
//   expect (Number(price)).toEqual(1397)
// });

// test('check price change for Galaxy S24 in JB-HiFi', async ({ page }) => {
//   await page.goto('https://www.jbhifi.com.au/products/samsung-galaxy-s24-5g-256gb-onyx-black-1');
//   const present_price = await page.locator('#pdp-price-cta span').last().textContent()
//   expect (Number(present_price)).toEqual(1387)
// });

// test('check price change for Galaxt S24 in OfficeWorks', async ({ page }) => {
//   await page.goto('https://www.officeworks.com.au/shop/officeworks/p/samsung-galaxy-s24-8gb-256gb-black-sas24256bk');
//   const present_price = await page.locator('span[data-ref$="product-price-isNotRR"] span').innerHTML()
//   const price = present_price.split('$')[1]
//   expect (Number(price)).toEqual(1387)
// });