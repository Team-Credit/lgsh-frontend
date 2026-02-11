/**
 * Puppeteer 화면 자동 캡처 스크립트
 *
 * 사용법:
 *   node capture-screens.js                    # 전체 캡처
 *   node capture-screens.js --only dashboard   # 특정 화면만 캡처
 *
 * 사전 조건:
 *   - npm install puppeteer (scripts/ 디렉토리에서)
 *   - React 개발 서버가 localhost:3000에서 실행 중
 *   - 백엔드 API 서버가 localhost:8080에서 실행 중
 */
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const routes = JSON.parse(fs.readFileSync(path.join(__dirname, 'routes.json'), 'utf-8'));
const BASE_URL = 'http://localhost:3000';
const OUTPUT_DIR = path.join(__dirname, 'screenshots');

// 로그인 계정 (환경변수 또는 기본값 - 테스트 계정)
const LOGIN_USER = process.env.CAPTURE_USER || 'admin';
const LOGIN_PASS = process.env.CAPTURE_PASS || 'password123';

// --only 옵션 파싱
const onlyArg = process.argv.indexOf('--only');
const onlyKey = onlyArg !== -1 ? process.argv[onlyArg + 1] : null;

async function captureAllScreens() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: { width: 1920, height: 1080 },
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();

  // 로그인 처리
  console.log('로그인 중...');
  try {
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2', timeout: 30000 });

    // 로그인 폼의 input 필드 대기 (class="form-input")
    await page.waitForSelector('input.form-input', { timeout: 10000 });

    // 아이디 입력 (첫 번째 form-input = 아이디)
    const inputs = await page.$$('input.form-input');
    if (inputs.length >= 2) {
      await inputs[0].click({ clickCount: 3 });
      await inputs[0].type(LOGIN_USER);

      // 비밀번호 입력 (두 번째 form-input = 비밀번호)
      await inputs[1].click({ clickCount: 3 });
      await inputs[1].type(LOGIN_PASS);
    }

    // 로그인 버튼 클릭
    const loginBtn = await page.$('button.login-button') || await page.$('button[type="submit"]');
    if (loginBtn) {
      await loginBtn.click();
    }

    // SPA 라우팅: URL이 /login에서 변경될 때까지 대기
    await page.waitForFunction(
      () => !window.location.pathname.includes('/login'),
      { timeout: 15000 }
    );

    // 대시보드 로딩 대기
    await new Promise((resolve) => setTimeout(resolve, 3000));

    console.log(`로그인 완료 (현재 URL: ${page.url()})\n`);
  } catch (err) {
    console.error('로그인 실패:', err.message);
    console.log('로그인 없이 계속 진행합니다...\n');
  }

  // 캡처 대상 필터
  const targetRoutes = onlyKey
    ? routes.filter((r) => r.menuKey === onlyKey)
    : routes;

  if (onlyKey && targetRoutes.length === 0) {
    console.error(`menuKey "${onlyKey}"에 해당하는 라우트를 찾을 수 없습니다.`);
    await browser.close();
    process.exit(1);
  }

  let successCount = 0;
  let failCount = 0;

  for (const route of targetRoutes) {
    try {
      console.log(`캡처 중: ${route.menuName} (${route.path})`);
      await page.goto(`${BASE_URL}${route.path}`, {
        waitUntil: 'networkidle2',
        timeout: 30000,
      });

      // 렌더링 대기 (동적 컴포넌트 로딩)
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // 로딩 스피너가 사라질 때까지 대기
      try {
        await page.waitForFunction(
          () => !document.querySelector('.ant-spin-spinning'),
          { timeout: 10000 }
        );
      } catch {
        // 스피너가 없으면 무시
      }

      // 추가 렌더링 안정화 대기
      await new Promise((resolve) => setTimeout(resolve, 500));

      await page.screenshot({
        path: path.join(OUTPUT_DIR, `${route.menuKey}.png`),
        fullPage: true,
      });

      console.log(`  -> 완료: ${route.menuKey}.png`);
      successCount++;
    } catch (err) {
      console.error(`  -> 실패: ${route.menuName} - ${err.message}`);
      failCount++;
    }
  }

  await browser.close();
  console.log(`\n캡처 완료: 성공 ${successCount}개, 실패 ${failCount}개 (전체 ${targetRoutes.length}개)`);
}

captureAllScreens().catch(console.error);
