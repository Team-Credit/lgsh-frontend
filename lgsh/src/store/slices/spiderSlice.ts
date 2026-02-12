/**
 * 스파이더웹 분석 Redux Slice
 * 화면 ID: SWB001
 */
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { message } from 'antd';
import spiderService from '@/services/spiderService';
import type {
  HashTag,
  SpiderAnalysisResult,
  AiSummaryResult,
  FilterOptionsResponse,
  SpiderAnalyzeRequest,
  FilterCondition,
} from '@/types/spider';
import type { RootState } from '@/store';

/** 태그에서 FilterCondition 추출 */
const tagsToCondition = (tags: HashTag[]): FilterCondition => {
  const condition: FilterCondition = {};
  for (const tag of tags) {
    switch (tag.type) {
      case 'person':
        condition.personId = tag.value;
        break;
      case 'age':
        condition.ageGroup = tag.value;
        break;
      case 'gender':
        condition.gender = tag.value;
        break;
      case 'region':
        condition.region = tag.value;
        break;
      case 'job':
        condition.jobCode = tag.value;
        break;
      case 'income': {
        const parts = tag.value.split('-');
        if (parts[0]) condition.incomeMin = Number(parts[0]);
        if (parts[1]) condition.incomeMax = Number(parts[1]);
        break;
      }
    }
  }
  return condition;
};

/** 정적 필터 옵션 (공통코드 기반) */
const STATIC_FILTER_OPTIONS: FilterOptionsResponse = {
  ageGroups: [
    { value: '20', label: '20대' },
    { value: '30', label: '30대' },
    { value: '40', label: '40대' },
    { value: '50', label: '50대' },
    { value: '60', label: '60대 이상' },
  ],
  genders: [
    { value: 'M', label: '남성' },
    { value: 'F', label: '여성' },
  ],
  regions: [
    { value: 'SEOUL', label: '서울' },
    { value: 'GYEONGGI', label: '경기' },
    { value: 'INCHEON', label: '인천' },
    { value: 'BUSAN', label: '부산' },
    { value: 'DAEGU', label: '대구' },
    { value: 'DAEJEON', label: '대전' },
    { value: 'GWANGJU', label: '광주' },
    { value: 'ULSAN', label: '울산' },
    { value: 'SEJONG', label: '세종' },
    { value: 'GANGWON', label: '강원' },
    { value: 'CHUNGBUK', label: '충북' },
    { value: 'CHUNGNAM', label: '충남' },
    { value: 'JEONBUK', label: '전북' },
    { value: 'JEONNAM', label: '전남' },
    { value: 'GYEONGBUK', label: '경북' },
    { value: 'GYEONGNAM', label: '경남' },
    { value: 'JEJU', label: '제주' },
  ],
  jobCodes: [
    { value: 'EMPLOYEE', label: '직장인' },
    { value: 'SELF_EMPLOYED', label: '자영업' },
    { value: 'FREELANCER', label: '프리랜서' },
    { value: 'PROFESSIONAL', label: '전문직' },
    { value: 'PENSION', label: '연금생활자' },
    { value: 'HOMEMAKER', label: '주부' },
    { value: 'STUDENT', label: '학생' },
    { value: 'UNEMPLOYED', label: '무직' },
    { value: 'OTHER', label: '기타' },
  ],
  incomeRanges: [
    { value: '0-2000', label: '2,000만원 미만', min: 0, max: 2000 },
    { value: '2000-3000', label: '2,000~3,000만원', min: 2000, max: 3000 },
    { value: '3000-5000', label: '3,000~5,000만원', min: 3000, max: 5000 },
    { value: '5000-7000', label: '5,000~7,000만원', min: 5000, max: 7000 },
    { value: '7000-', label: '7,000만원 이상', min: 7000, max: null },
  ],
};

// State 타입
interface SpiderState {
  year: number;       // 분석 대상 년도
  month: number;      // 분석 대상 월
  ctlYear: number;    // 비교 기준 년도
  ctlMonth: number;   // 비교 기준 월
  expTags: HashTag[];
  ctlTags: HashTag[];
  filterOptions: FilterOptionsResponse;
  analysisResult: SpiderAnalysisResult | null;
  aiSummary: AiSummaryResult | null;
  isAnalyzing: boolean;
  isAiLoading: boolean;
  isPdfLoading: boolean;
}

const now = new Date();

const initialState: SpiderState = {
  year: now.getFullYear(),
  month: now.getMonth() + 1,
  ctlYear: now.getFullYear(),
  ctlMonth: now.getMonth() + 1,
  expTags: [],
  ctlTags: [],
  filterOptions: STATIC_FILTER_OPTIONS,
  analysisResult: null,
  aiSummary: null,
  isAnalyzing: false,
  isAiLoading: false,
  isPdfLoading: false,
};

// 분석 실행 Thunk
export const analyze = createAsyncThunk(
  'spider/analyze',
  async (_, { getState, rejectWithValue }) => {
    const state = getState() as RootState;
    const { year, month, ctlYear, ctlMonth, expTags, ctlTags } = state.spider;
    const companyId = state.auth.user?.companyId;

    if (!year || !month) {
      message.warning('분석 대상 년월을 선택해주세요.');
      return rejectWithValue('년월 미선택');
    }
    if (!ctlYear || !ctlMonth) {
      message.warning('비교 기준 년월을 선택해주세요.');
      return rejectWithValue('비교 년월 미선택');
    }

    const request: SpiderAnalyzeRequest = {
      year,
      month,
      ctlYear,
      ctlMonth,
      companyId: companyId || undefined,
      experiment: tagsToCondition(expTags),
      control: tagsToCondition(ctlTags),
    };

    try {
      const response = await spiderService.analyze(request);
      if (response.success && response.data) {
        message.success('스파이더웹 분석이 완료되었습니다.');
        return response.data;
      }
      const errMsg = response.message || '분석에 실패했습니다.';
      message.error(errMsg);
      return rejectWithValue(errMsg);
    } catch (error: any) {
      const errMsg = error?.response?.data?.message || '분석 중 오류가 발생했습니다.';
      message.error(errMsg);
      return rejectWithValue(errMsg);
    }
  }
);

// AI 요약 요청 Thunk
export const requestAiSummary = createAsyncThunk(
  'spider/requestAiSummary',
  async (_, { getState, rejectWithValue }) => {
    const state = getState() as RootState;
    const { analysisResult } = state.spider;

    if (!analysisResult) {
      message.warning('분석 결과가 없어 AI 요약을 생성할 수 없습니다.');
      return rejectWithValue('분석 결과 없음');
    }

    try {
      const response = await spiderService.aiSummary(analysisResult);
      if (response.success && response.data) {
        message.success('AI 분석 요약이 생성되었습니다.');
        return response.data;
      }
      const errMsg = response.message || 'AI 분석에 실패했습니다.';
      message.error(errMsg);
      return rejectWithValue(errMsg);
    } catch (error: any) {
      const errMsg = error?.response?.data?.message || 'AI 분석 중 오류가 발생했습니다.';
      message.error(errMsg);
      return rejectWithValue(errMsg);
    }
  }
);

// PDF 생성 Thunk
export const generatePdf = createAsyncThunk(
  'spider/generatePdf',
  async (_, { getState, rejectWithValue }) => {
    const state = getState() as RootState;
    const { analysisResult, aiSummary, year, month } = state.spider;

    if (!analysisResult) {
      message.warning('분석 결과가 없습니다.');
      return rejectWithValue('분석 결과 없음');
    }

    try {
      const response = await spiderService.generatePdf({
        year,
        month,
        title: '신용평가 비교 분석 보고서',
        experiment: analysisResult.experiment,
        control: analysisResult.control,
        diff: analysisResult.diff,
        aiSummary,
      });

      if (response.success && response.data) {
        const { pdfBase64, fileName } = response.data;
        const byteCharacters = atob(pdfBase64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.click();
        URL.revokeObjectURL(url);
        message.success('PDF가 다운로드되었습니다.');
        return response.data;
      }
      const errMsg = response.message || 'PDF 생성에 실패했습니다.';
      message.error(errMsg);
      return rejectWithValue(errMsg);
    } catch (error: any) {
      const errMsg = error?.response?.data?.message || 'PDF 생성 중 오류가 발생했습니다.';
      message.error(errMsg);
      return rejectWithValue(errMsg);
    }
  }
);

// Slice
const spiderSlice = createSlice({
  name: 'spider',
  initialState,
  reducers: {
    setYearMonth: (state, action: PayloadAction<{ year: number; month: number }>) => {
      state.year = action.payload.year;
      state.month = action.payload.month;
    },
    setCtlYearMonth: (state, action: PayloadAction<{ year: number; month: number }>) => {
      state.ctlYear = action.payload.year;
      state.ctlMonth = action.payload.month;
    },
    addExpTag: (state, action: PayloadAction<HashTag>) => {
      const tag = action.payload;
      const idx = state.expTags.findIndex((t) => t.type === tag.type);
      if (idx >= 0) {
        state.expTags[idx] = tag;
      } else {
        state.expTags.push(tag);
      }
    },
    removeExpTag: (state, action: PayloadAction<string>) => {
      state.expTags = state.expTags.filter((t) => t.id !== action.payload);
    },
    addCtlTag: (state, action: PayloadAction<HashTag>) => {
      const tag = action.payload;
      if (tag.type === 'person') return;
      const idx = state.ctlTags.findIndex((t) => t.type === tag.type);
      if (idx >= 0) {
        state.ctlTags[idx] = tag;
      } else {
        state.ctlTags.push(tag);
      }
    },
    removeCtlTag: (state, action: PayloadAction<string>) => {
      state.ctlTags = state.ctlTags.filter((t) => t.id !== action.payload);
    },
    setAnalysisResult: (state, action: PayloadAction<SpiderAnalysisResult>) => {
      state.analysisResult = action.payload;
    },
    setAiSummary: (state, action: PayloadAction<AiSummaryResult>) => {
      state.aiSummary = action.payload;
    },
    resetAll: (state) => {
      const now = new Date();
      state.year = now.getFullYear();
      state.month = now.getMonth() + 1;
      state.ctlYear = now.getFullYear();
      state.ctlMonth = now.getMonth() + 1;
      state.expTags = [];
      state.ctlTags = [];
      state.analysisResult = null;
      state.aiSummary = null;
      state.isAnalyzing = false;
      state.isAiLoading = false;
      state.isPdfLoading = false;
    },
  },
  extraReducers: (builder) => {
    builder
      // 분석
      .addCase(analyze.pending, (state) => {
        state.isAnalyzing = true;
        state.analysisResult = null;
        state.aiSummary = null;
      })
      .addCase(analyze.fulfilled, (state, action) => {
        state.isAnalyzing = false;
        state.analysisResult = action.payload as SpiderAnalysisResult;
      })
      .addCase(analyze.rejected, (state) => {
        state.isAnalyzing = false;
      })
      // AI 요약
      .addCase(requestAiSummary.pending, (state) => {
        state.isAiLoading = true;
      })
      .addCase(requestAiSummary.fulfilled, (state, action) => {
        state.isAiLoading = false;
        state.aiSummary = action.payload as AiSummaryResult;
      })
      .addCase(requestAiSummary.rejected, (state) => {
        state.isAiLoading = false;
      })
      // PDF
      .addCase(generatePdf.pending, (state) => {
        state.isPdfLoading = true;
      })
      .addCase(generatePdf.fulfilled, (state) => {
        state.isPdfLoading = false;
      })
      .addCase(generatePdf.rejected, (state) => {
        state.isPdfLoading = false;
      });
  },
});

export const {
  setYearMonth,
  setCtlYearMonth,
  addExpTag,
  removeExpTag,
  addCtlTag,
  removeCtlTag,
  setAnalysisResult,
  setAiSummary,
  resetAll,
} = spiderSlice.actions;

export default spiderSlice.reducer;
