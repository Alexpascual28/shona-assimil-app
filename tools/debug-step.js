const puppeteer = require('../app/node_modules/puppeteer-core');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true
  });
  const page = await browser.newPage();
  await page.goto('http://localhost:5173/');
  await page.waitForSelector('footer button:last-child');
  
  // Select Lesson 2
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('aside button'));
    for (const btn of buttons) {
      const badge = btn.querySelector('span');
      if (badge && badge.textContent.trim() === '2') {
        btn.click();
        return;
      }
    }
  });
  await new Promise(r => setTimeout(r, 500));
  console.log('--- STEP 1 MAIN ---');
  console.log(await page.evaluate(() => document.querySelector('main').innerText));

  // Click next
  const nextBtn = await page.waitForSelector('footer button:last-child');
  await nextBtn.click();
  await new Promise(r => setTimeout(r, 600));

  console.log('--- STEP 2 MAIN ---');
  console.log(await page.evaluate(() => document.querySelector('main').innerText));

  await browser.close();
})();
