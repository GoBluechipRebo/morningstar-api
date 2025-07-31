const express = require('express');
const bodyParser = require('body-parser');
const puppeteer = require('puppeteer');
const PuppeteerHar = require('puppeteer-har');
const fs = require('fs');

const app = express();
const PORT = 3000;

app.use(bodyParser.json());

app.post('/extract-security-id', async (req, res) => {
  const isin = req.body.isin;

  if (!isin) {
    return res.status(400).json({ error: 'Missing ISIN in request body' });
  }

  const url = `https://global.morningstar.com/es/inversiones/fondos/${isin}/cartera`;
  const harPath = `har-${isin}.har`;

  try {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    const har = new PuppeteerHar(page);

    await har.start({ path: harPath });
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });
    await har.stop();
    await browser.close();

    const harContent = fs.readFileSync(harPath, 'utf8');
    fs.unlinkSync(harPath); // eliminar el archivo .har

    const regex = /\/fund\/(?:portfolio|process)\/[^\/]+\/([^\/]+)\/data/;
    const match = harContent.match(regex);
    const securityId = match ? match[1] : null;

    res.json({
      isin,
      securityId,
      success: !!securityId
    });
  } catch (error) {
    console.error('Error extracting Security ID:', error);
    res.status(500).json({ error: 'Failed to extract Security ID', details: error.toString() });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
