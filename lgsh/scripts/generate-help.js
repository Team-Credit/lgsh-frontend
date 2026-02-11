/**
 * Claude API 도움말 자동 생성 스크립트
 *
 * 사용법:
 *   node generate-help.js                       # 전체 생성
 *   node generate-help.js --only dashboard      # 특정 화면만 생성
 *
 * 사전 조건:
 *   - npm install @anthropic-ai/sdk (scripts/ 디렉토리에서)
 *   - ANTHROPIC_API_KEY 환경변수 설정
 *   - screenshots/ 디렉토리에 캡처된 PNG 파일 존재
 */
const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs');
const path = require('path');

const client = new Anthropic(); // ANTHROPIC_API_KEY 환경변수 자동 사용
const routes = JSON.parse(fs.readFileSync(path.join(__dirname, 'routes.json'), 'utf-8'));
const SCREENSHOT_DIR = path.join(__dirname, 'screenshots');
const OUTPUT_DIR = path.join(__dirname, '..', 'src', 'help', 'data');

// --only 옵션 파싱
const onlyArg = process.argv.indexOf('--only');
const onlyKey = onlyArg !== -1 ? process.argv[onlyArg + 1] : null;

const SYSTEM_PROMPT = `당신은 소프트웨어 사용자 매뉴얼 작성 전문가입니다.
주어진 웹 화면 스크린샷을 분석하여 사용자 도움말을 JSON 형식으로 작성해주세요.

이 시스템은 "로지신해 AI 신용평가 시스템"으로, 기업/개인의 신용평가를 AI로 수행하는 웹 애플리케이션입니다.

분석 시 다음을 포함해주세요:
- 화면의 전체 목적과 기능
- 각 영역(조회조건, 데이터 목록, 버튼 영역 등) 구분
- 입력 필드, 버튼, 테이블 등의 사용법
- 실무에서 유용한 팁

반드시 아래 JSON 형식으로만 응답하세요 (마크다운 코드블록 없이 순수 JSON):
{
  "title": "화면 제목",
  "description": "이 화면의 전체 목적과 기능 요약 (1-2문장)",
  "sections": [
    {
      "title": "영역 이름 (예: 조회 조건, 데이터 목록, 버튼 영역 등)",
      "description": "해당 영역의 설명",
      "items": [
        {
          "label": "항목명 (예: 고객명 입력, 조회 버튼 등)",
          "description": "해당 항목의 사용법 설명"
        }
      ]
    }
  ],
  "tips": ["유용한 사용 팁 1", "유용한 사용 팁 2"]
}`;

async function generateHelp(route) {
  const screenshotPath = path.join(SCREENSHOT_DIR, `${route.menuKey}.png`);

  if (!fs.existsSync(screenshotPath)) {
    console.error(`  스크린샷 없음: ${screenshotPath}`);
    return null;
  }

  const imageData = fs.readFileSync(screenshotPath).toString('base64');

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/png',
                data: imageData,
              },
            },
            {
              type: 'text',
              text: `이 화면은 "${route.menuName}" 메뉴입니다. 경로: ${route.path}\n이 화면의 사용자 도움말을 작성해주세요.`,
            },
          ],
        },
      ],
    });

    const content = response.content[0].text;
    // JSON 추출 (마크다운 코드블록이 포함될 수 있음)
    const jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(jsonStr);
  } catch (err) {
    console.error(`  API 오류 (${route.menuName}): ${err.message}`);
    return null;
  }
}

async function generateAllHelp() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // 기존 인덱스 로드 (있으면)
  const indexPath = path.join(OUTPUT_DIR, 'help-index.json');
  let helpIndex = {};
  if (fs.existsSync(indexPath)) {
    try {
      helpIndex = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
    } catch {
      helpIndex = {};
    }
  }

  // 캡처 대상 필터
  const targetRoutes = onlyKey
    ? routes.filter((r) => r.menuKey === onlyKey)
    : routes;

  if (onlyKey && targetRoutes.length === 0) {
    console.error(`menuKey "${onlyKey}"에 해당하는 라우트를 찾을 수 없습니다.`);
    process.exit(1);
  }

  let successCount = 0;
  let failCount = 0;

  for (const route of targetRoutes) {
    console.log(`도움말 생성 중: ${route.menuName} (${route.menuKey})`);
    const helpData = await generateHelp(route);

    if (helpData) {
      // 개별 JSON 파일 저장
      const filePath = path.join(OUTPUT_DIR, `${route.menuKey}.json`);
      fs.writeFileSync(filePath, JSON.stringify(helpData, null, 2), 'utf-8');

      // 인덱스에 추가
      helpIndex[route.path] = {
        menuKey: route.menuKey,
        menuName: route.menuName,
        file: `${route.menuKey}.json`,
      };

      console.log(`  -> 저장: ${route.menuKey}.json`);
      successCount++;
    } else {
      failCount++;
    }

    // API Rate Limit 방지 (1초 대기)
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  // 인덱스 파일 저장
  fs.writeFileSync(indexPath, JSON.stringify(helpIndex, null, 2), 'utf-8');

  console.log(`\n도움말 생성 완료: 성공 ${successCount}개, 실패 ${failCount}개 (전체 ${targetRoutes.length}개)`);
  console.log(`인덱스 파일: ${indexPath}`);
}

generateAllHelp().catch(console.error);
