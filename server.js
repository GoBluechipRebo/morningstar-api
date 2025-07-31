const express = require('express');
const bodyParser = require('body-parser');
const puppeteer = require('puppeteer');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());

app.post('/extract-security-id', async (req, res) => {
  const isin = req.body.isin;

  if (!isin) {
    return res.status(400).json({ error: 'Missing ISIN in request body' });
  }

  const url = `https://global.morningstar.com/es/inversiones/fondos/${isin}/cartera`;

  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    let securityId = null;

    // Intercept network responses
    page.on('response', async (response) => {
      const reqUrl = response.url();
      const match = reqUrl.match(/\/fund\/(?:portfolio|process)\/[^\/]+\/([^\/]+)\/data/);
      if (match && match[1]) {
        securityId = match[1];
      }
    });

    await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });
    await browser.close();

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
