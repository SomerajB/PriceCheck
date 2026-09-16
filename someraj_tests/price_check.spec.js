// @ts-check
const { test, expect } = require('@playwright/test');

test('check price change for iphone 17 Pro in JB-HiFi', async ({ page }) => {
  await page.goto('https://www.jbhifi.com.au/products/apple-iphone-17-pro-256gb-cosmic-orange');
  const present_price = await page.locator('#pdp-price-cta span').last().textContent()
  expect (Number(present_price)).toEqual(1799)
});

test('check price change for iphone 18 Pro in JB-HiFi', async ({ page }) => {
  await page.goto('https://www.jbhifi.com.au/products/apple-iphone-18-pro-256gb-burgundy');
  const present_price = await page.locator('#pdp-price-cta span').last().textContent()
  expect (Number(present_price)).toEqual(2099)
});

test('check price change for iphone 17 Pro in Officeworks', async ({ request }) => {
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

test('check price change for iphone 18 Pro in Officeworks', async ({ request }) => {
  const endpoint = 'https://www.officeworks.com.au/catalogue-app/api/prices/IP18PR2BY';

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
  expect(responseBody.IP18PR2BY.price).toEqual(209700)
  
  
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
  expect(responseBody.requestResponseMap.applicationStatus[0].TXT_MSG_KEY).toEqual('Passport has been printed; post quality check will be dispatched in the coming weeks.')
  
  
});

test('check for new ghost story', async ({ page }) => {
  await page.goto('https://www.ebanglalibrary.com/genres/%e0%a6%ad%e0%a7%8c%e0%a6%a4%e0%a6%bf%e0%a6%95/?_sorting=newfirst');
  const latestStory = await page.locator('article>div>h2').first().textContent()
  expect (latestStory).toEqual('গা-ছমছমে ভৌতিক অলৌকিক – হিমাদ্রিকিশোর দাশগুপ্ত')
});


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