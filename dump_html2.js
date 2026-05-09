import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('LOG:', msg.text()));
  page.on('pageerror', error => console.log('ERROR:', error.message));
  
  await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 3000));
  
  const html = await page.content();
  console.log("HTML length:", html.length);
  // print out the whole html since the server output is big
  const rootHtml = await page.evaluate(() => document.getElementById('root').innerHTML);
  console.log("ROOT:", rootHtml.substring(0, 1000));
  
  await browser.close();
})();
