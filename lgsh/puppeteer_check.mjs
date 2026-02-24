import puppeteer from 'puppeteer';

const BASE_URL = 'http://localhost:3000';
const SCREENSHOT_DIR = 'C:/LGSH_DEV_V2/lgsh-frontend/lgsh/screenshots';

async function getAuthTokens() {
  const resp = await fetch('http://localhost:8080/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: 'admin', password: 'password123' }),
  });
  const data = await resp.json();
  return data.data;
}

async function main() {
  const auth = await getAuthTokens();
  console.log('Logged in as:', auth.user.userNm);

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  const userStr = JSON.stringify(auth.user);
  await page.evaluateOnNewDocument((at, rt, us) => {
    localStorage.setItem('accessToken', at);
    localStorage.setItem('refreshToken', rt);
    localStorage.setItem('user', us);
    localStorage.setItem('sessionId', 'puppeteer-session');
    // Clear stored column widths to test defaults
    const keys = Object.keys(localStorage);
    keys.forEach(k => {
      if (k.includes('ColumnWidths') || k.includes('VisibleColumns')) {
        localStorage.removeItem(k);
      }
    });
  }, auth.accessToken, auth.refreshToken, userStr);

  // Navigate to dashboard first to verify
  await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle2', timeout: 15000 });
  await new Promise(r => setTimeout(r, 1000));

  const gridPages = [
    { name: 'users', path: '/users' },
    { name: 'persons', path: '/persons' },
    { name: 'companies', path: '/companies' },
    { name: 'models', path: '/models' },
    { name: 'variables', path: '/admin/variables' },
    { name: 'rawdata-list', path: '/admin/rawdata-list' },
    { name: 'codes', path: '/admin/codes' },
    { name: 'messages', path: '/admin/messages' },
    { name: 'configs', path: '/admin/configs' },
    { name: 'users-approval', path: '/users/approval' },
    { name: 'report-history', path: '/report/history' },
    { name: 'report-items', path: '/report/items' },
    { name: 'companies-settings', path: '/companies/settings' },
    { name: 'admin-batch', path: '/admin/batch' },
    { name: 'admin-files', path: '/admin/files' },
  ];

  for (const p of gridPages) {
    try {
      await page.goto(`${BASE_URL}${p.path}`, { waitUntil: 'networkidle2', timeout: 15000 });
      await new Promise(r => setTimeout(r, 3000));

      const tableInfo = await page.evaluate(() => {
        const table = document.querySelector('.ant-table');
        if (!table) return { exists: false };

        const headers = Array.from(table.querySelectorAll('.ant-table-thead th'));
        const headerWidths = headers.map(h => ({
          text: h.textContent?.trim(),
          width: Math.round(h.getBoundingClientRect().width),
        }));

        const rows = Array.from(table.querySelectorAll('.ant-table-tbody tr.ant-table-row'));
        let maxRowHeight = 0;
        let multiLineRows = 0;
        rows.forEach(r => {
          const height = r.getBoundingClientRect().height;
          if (height > 44) multiLineRows++;
          maxRowHeight = Math.max(maxRowHeight, height);
        });

        const handles = table.querySelectorAll('.react-resizable-handle');

        return {
          exists: true,
          headerWidths,
          rowCount: rows.length,
          maxRowHeight: Math.round(maxRowHeight),
          multiLineRows,
          handleCount: handles.length,
        };
      });

      console.log(`\n=== ${p.name} (${p.path}) ===`);
      if (tableInfo.exists) {
        console.log(`  Rows: ${tableInfo.rowCount}, MaxH: ${tableInfo.maxRowHeight}px, MultiLine: ${tableInfo.multiLineRows}`);
        console.log(`  Handles: ${tableInfo.handleCount}`);
        tableInfo.headerWidths?.forEach(h => {
          console.log(`    ${h.text}: ${h.width}px${h.width < 100 ? ' <NARROW>' : ''}`);
        });
      } else {
        console.log('  No table');
      }
      await page.screenshot({ path: `${SCREENSHOT_DIR}/${p.name}.png`, fullPage: false });
    } catch (e) {
      console.log(`  Error: ${e.message}`);
    }
  }

  await browser.close();
  console.log('\nDone!');
}

main().catch(console.error);
