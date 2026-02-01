const puppeteer = require('puppeteer');
const path = require('path');
const http = require('http');
const fs = require('fs');

const PORT = 8765;
const ROOT = path.join(__dirname);

// tiny static server
const server = http.createServer((req, res) => {
  let filePath = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (filePath.endsWith('/')) filePath = path.join(filePath, 'Toolboss.html');
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    let contentType = 'text/html';
    if (filePath.endsWith('.js')) contentType = 'application/javascript';
    if (filePath.endsWith('.css')) contentType = 'text/css';
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
});

(async () => {
  server.listen(PORT);
  console.log('Server started on http://localhost:' + PORT);

  const browser = await puppeteer.launch({ headless: false, args: ['--disable-infobars'] });
  const page = await browser.newPage();
  page.setDefaultTimeout(30000);

  try {
    await page.goto('http://localhost:' + PORT + '/Toolboss.html');
    console.log('Page loaded');

    // Click calculate to populate results (wait for possible JS)
    await page.waitForSelector('.calculate-btn');
    await page.click('.calculate-btn');
    console.log('Clicked calculate');

    // Wait for results to appear
    await page.waitForSelector('#results.show', { timeout: 5000 });
    console.log('Results visible');

    // Intercept new target (tab) opening
    const [popup] = await Promise.all([
      new Promise(resolve => browser.once('targetcreated', target => resolve(target))),
      page.click('.export-btn')
    ]);

    const popupPage = await popup.page();
    if (popupPage) {
      console.log('PDF preview tab opened');
      // Wait a bit and then close
      await popupPage.waitForTimeout(2000);
      await popupPage.close();
    } else {
      console.log('No preview tab (popup blocked or download used)');
    }

    console.log('Smoke test completed');
  } catch (err) {
    console.error('Smoke test failed:', err);
    process.exitCode = 1;
  } finally {
    await browser.close();
    server.close();
  }
})();
