/**
 * Cron 표현식 유틸리티
 * Spring Cron 형식: 초 분 시 일 월 요일
 * 예: "0 0 2 * * ?" = 매일 02:00
 */

import type { ScheduleType } from '@/types/batch';

// 요일 레이블
export const DAY_OF_WEEK_LABELS: Record<number, string> = {
  1: '월요일',
  2: '화요일',
  3: '수요일',
  4: '목요일',
  5: '금요일',
  6: '토요일',
  0: '일요일',
};

// Spring Cron 요일 매핑 (1=MON ~ 7=SUN)
const SPRING_CRON_DOW: Record<number, string> = {
  1: 'MON',
  2: 'TUE',
  3: 'WED',
  4: 'THU',
  5: 'FRI',
  6: 'SAT',
  0: 'SUN',
};

/**
 * 스케줄 유형에 따라 Cron 표현식 생성
 * @param type 스케줄 유형
 * @param hour 시 (0-23)
 * @param minute 분 (0-59)
 * @param dayOfWeek 요일 (0=일 ~ 6=토, WEEKLY 전용)
 * @param dayOfMonth 일 (1-31, MONTHLY 전용)
 */
export function buildCronExpression(
  type: ScheduleType,
  hour: number,
  minute: number,
  dayOfWeek?: number,
  dayOfMonth?: number,
): string {
  switch (type) {
    case 'DAILY':
      return `0 ${minute} ${hour} * * ?`;
    case 'WEEKLY':
      return `0 ${minute} ${hour} ? * ${SPRING_CRON_DOW[dayOfWeek ?? 1]}`;
    case 'MONTHLY':
      return `0 ${minute} ${hour} ${dayOfMonth ?? 1} * ?`;
    case 'CRON':
      return ''; // 직접 입력
    default:
      return '';
  }
}

/**
 * Cron 표현식을 한국어로 변환
 * @param cron Spring Cron 표현식
 * @returns 한국어 설명 ("매일 02:00", "매주 월요일 03:30" 등)
 */
export function cronToReadable(cron: string): string {
  if (!cron || cron.trim() === '') return '';

  const parts = cron.trim().split(/\s+/);
  if (parts.length !== 6) return cron;

  const [, minute, hour, dayOfMonth, , dayOfWeek] = parts;
  const timeStr = `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;

  // 매일: 0 M H * * ?
  if (dayOfMonth === '*' && dayOfWeek === '?') {
    return `매일 ${timeStr}`;
  }

  // 매주: 0 M H ? * DOW
  if (dayOfMonth === '?' && dayOfWeek !== '*' && dayOfWeek !== '?') {
    const dowName = getDayOfWeekName(dayOfWeek);
    return `매주 ${dowName} ${timeStr}`;
  }

  // 매월: 0 M H D * ?
  if (dayOfMonth !== '*' && dayOfMonth !== '?' && dayOfWeek === '?') {
    return `매월 ${dayOfMonth}일 ${timeStr}`;
  }

  return cron;
}

/**
 * Cron 요일 코드를 한국어 요일명으로 변환
 */
function getDayOfWeekName(dow: string): string {
  const map: Record<string, string> = {
    MON: '월요일', TUE: '화요일', WED: '수요일',
    THU: '목요일', FRI: '금요일', SAT: '토요일', SUN: '일요일',
    '1': '일요일', '2': '월요일', '3': '화요일', '4': '수요일',
    '5': '목요일', '6': '금요일', '7': '토요일',
  };
  return map[dow.toUpperCase()] || dow;
}

/**
 * Cron 표현식 유효성 검사 (간단 검증)
 * Spring Cron: 초 분 시 일 월 요일 (6자리)
 */
export function isValidCron(cron: string): boolean {
  if (!cron || cron.trim() === '') return false;

  const parts = cron.trim().split(/\s+/);
  if (parts.length !== 6) return false;

  // 기본 형식 검사 (각 파트가 유효한 문자만 포함)
  const validChars = /^[0-9*?,/LW#-]+$/i;
  for (const part of parts) {
    if (!validChars.test(part)) return false;
  }

  // 초는 0 이어야 함 (Spring에서는 초 지원하지만, 우리는 0으로 고정)
  // 분: 0-59, 시: 0-23
  const sec = parseInt(parts[0]);
  const min = parseInt(parts[1]);
  const hr = parseInt(parts[2]);

  if (!isNaN(sec) && (sec < 0 || sec > 59)) return false;
  if (!isNaN(min) && (min < 0 || min > 59)) return false;
  if (!isNaN(hr) && (hr < 0 || hr > 23)) return false;

  return true;
}

/**
 * Cron 표현식 파싱 (편집용)
 * 스케줄 유형, 시간, 요일/일 등을 추출
 */
export function parseCronExpression(cron: string): {
  scheduleType: ScheduleType;
  hour: number;
  minute: number;
  dayOfWeek?: number;
  dayOfMonth?: number;
} | null {
  if (!cron || cron.trim() === '') return null;

  const parts = cron.trim().split(/\s+/);
  if (parts.length !== 6) return null;

  const [, minuteStr, hourStr, dayOfMonthStr, , dayOfWeekStr] = parts;

  const hour = parseInt(hourStr) || 0;
  const minute = parseInt(minuteStr) || 0;

  // 매일: * * ? 또는 일=*, 요일=?
  if (dayOfMonthStr === '*' && dayOfWeekStr === '?') {
    return { scheduleType: 'DAILY', hour, minute };
  }

  // 매주: ?와 요일코드
  if (dayOfMonthStr === '?' && dayOfWeekStr !== '*' && dayOfWeekStr !== '?') {
    const dowMap: Record<string, number> = {
      MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5, SAT: 6, SUN: 0,
    };
    const dayOfWeek = dowMap[dayOfWeekStr.toUpperCase()] ?? 1;
    return { scheduleType: 'WEEKLY', hour, minute, dayOfWeek };
  }

  // 매월: 특정 일
  if (dayOfMonthStr !== '*' && dayOfMonthStr !== '?' && dayOfWeekStr === '?') {
    const dayOfMonth = parseInt(dayOfMonthStr) || 1;
    return { scheduleType: 'MONTHLY', hour, minute, dayOfMonth };
  }

  // 그 외: Cron 직접입력
  return { scheduleType: 'CRON', hour, minute };
}
