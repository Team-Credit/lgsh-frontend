/**
 * 라우트 설정
 * 메뉴/페이지 추가 시 이 파일만 수정하면 됩니다.
 */
import React, { lazy } from 'react';

const CreditEvaluationTargetPage = lazy(
  () => import('@/pages/person/CreditEvaluationTargetPage')
);

// Lazy Loading으로 컴포넌트 동적 로드
const DashboardPage = lazy(() => import('@/pages/dashboard/DashboardPage'));
const PersonGroupPage = lazy(() => import('@/pages/person/PersonGroupPage'));
const PersonPage = lazy(() => import('@/pages/person/PersonPage'));
const PersonDetailData = lazy(() => import('@/pages/person/PersonDetailData'));
const CommonCodePage = lazy(() => import('@/pages/system/CommonCodePage'));
const UserPage = lazy(() => import('@/pages/user/UserPage'));
const UserApprovalPage = lazy(() => import('@/pages/user/UserApprovalPage'));
const UserDetailPage = lazy(() => import('@/pages/user/UserDetailPage'));
const CompanyPage = lazy(() => import('@/pages/company/CompanyPage'));
const CompanySettingsPage = lazy(() => import('@/pages/company/CompanySettingsPage'));
const CreditEvaluatePage = lazy(() => import('@/pages/credit/CreditEvaluatePage'));
const CreditDistributionPage = lazy(() => import('@/pages/credit/CreditDistributionPage'));
const EdaAnalysisPage = lazy(() => import('@/pages/analysis/EdaAnalysisPage'));
const ModelSelectPage = lazy(() => import('@/pages/analysis/ModelSelectPage'));
const ModelListPage = lazy(() => import('@/pages/model/ModelListPage'));
const VariableListPage = lazy(() => import('@/pages/variable/VariableListPage'));
const MessageCodePage = lazy(() => import('@/pages/system/MessageCodePage'));
const SysConfigPage = lazy(() => import('@/pages/system/SysConfigPage'));
const FileManagementPage = lazy(() => import('@/pages/system/FileManagementPage'));
const BatchManagementPage = lazy(() => import('@/pages/system/BatchManagementPage'));
const SimulationPage = lazy(() => import('@/pages/simulation/SimulationPage'));
const SimulationHistoryPage = lazy(() => import('@/pages/simulation/SimulationHistoryPage'));
const MenuAdminPage = lazy(() => import('@/pages/system/MenuAdminPage'));
const ChatPage = lazy(() => import('@/pages/chat/ChatPage'));

// 공지사항
const NoticeListPage = lazy(() => import('@/pages/notice/NoticeListPage'));
const NoticeDetail = lazy(() => import('@/pages/notice/NoticeDetail'));
const NoticeFormPage = lazy(() => import('@/pages/notice/NoticeFormPage'));

// 라우트 타입 정의
export interface RouteConfig {
  path: string;
  element: React.LazyExoticComponent<React.FC> | React.FC;
  title?: string;
  menuId?: string;
}

/**
 * 라우트 설정 목록
 * 새 페이지 추가 시 여기에 등록
 */
export const routes: RouteConfig[] = [
  // 대시보드
  {
    path: 'dashboard',
    element: DashboardPage,
    title: '대시보드',
    menuId: 'M01',
  },

  // 신용평가 > 대상자 목록
{
  path: 'persons',
  element: CreditEvaluationTargetPage,
  title: '대상자 목록',
  menuId: 'M0200',
},


  // 신용평가 > 대상자등록
  {
    path: 'persons/create',
    element: PersonPage,
    title: '대상자등록',
    menuId: 'M0201',
  },

  // 신용평가 > 대상자 상세(360°)
  {
    path: 'persons/detail',
    element: PersonDetailData,
    title: '대상자상세',
    menuId: 'M0204',
  },

  // 신용평가 > 대상자 상세(360°) - 직접 조회
  {
    path: 'persons/detail/:personId',
    element: PersonDetailData,
    title: '대상자상세',
  },

  // 신용평가 > 평가 실행
  {
    path: 'credit/run',
    element: CreditEvaluatePage,
    title: '평가 실행',
    menuId: 'M0202',
  },

  // 신용평가 > 점수 분포
  {
    path: 'credit/distribution',
    element: CreditDistributionPage,
    title: '점수 분포',
    menuId: 'M0203',
  },

  // 신용평가 > 시뮬레이션 실행
  {
    path: 'simulation',
    element: SimulationPage,
    title: '시뮬레이션',
    menuId: 'M0206',
  },

  // 신용평가 > 시뮬레이션 이력
  {
    path: 'simulation/history',
    element: SimulationHistoryPage,
    title: '시뮬레이션이력',
    menuId: 'M0207',
  },

  // 분석관리 > 데이터 분석
  {
    path: 'analysis',
    element: EdaAnalysisPage,
    title: '데이터 분석',
    menuId: 'M0301',
  },
  // Analysis > Model Select
  {
    path: 'analysis/model-select',
    element: ModelSelectPage,
    title: '\uBAA8\uB378 \uC120\uD0DD',
    menuId: 'M0303',
  },


  // 분석관리 > 모델관리
  {
    path: 'models',
    element: ModelListPage,
    title: '모델관리',
    menuId: 'M0401',
  },

  // 분석관리 > 변수 메타 관리
  {
    path: 'admin/variables',
    element: VariableListPage,
    title: '변수 메타 관리',
    menuId: 'M0302',
  },

  // 신용평가 > 관리그룹
  {
    path: 'psngrp',
    element: PersonGroupPage,
    title: '관리그룹',
    menuId: 'M0205',
  },

  // 시스템관리 > 공통코드관리
  {
    path: 'admin/codes',
    element: CommonCodePage,
    title: '공통코드관리',
    menuId: 'M0801',
  },

  // 시스템관리 > 메뉴관리
  {
    path: 'admin/menus',
    element: MenuAdminPage,
    title: '메뉴관리',
    menuId: 'M0802',
  },

  // 사용자관리 > 사용자목록
  {
    path: 'users',
    element: UserPage,
    title: '사용자목록',
    menuId: 'M0501',
  },

  // 사용자관리 > 사용자승인
  {
    path: 'users/approval',
    element: UserApprovalPage,
    title: '사용자승인',
    menuId: 'M0502',
  },

  // 사용자관리 > 사용자상세(메뉴에서 직접 접근)
  {
    path: 'users/detail',
    element: UserDetailPage,
    title: '사용자상세',
    menuId: 'M0503',
  },

  // 사용자관리 > 사용자상세(목록에서 접근)
  {
    path: 'users/detail/:userId',
    element: UserDetailPage,
    title: '사용자상세',
  },

  // 원청사관리 > 원청사목록
  {
    path: 'companies',
    element: CompanyPage,
    title: '원청사목록',
    menuId: 'M0601',
  },

  // 원청사관리 > 원청사설정
  {
    path: 'companies/settings',
    element: CompanySettingsPage,
    title: '원청사설정',
    menuId: 'M0602',
  },

  // 시스템관리 > 메시지코드관리
  {
    path: 'admin/messages',
    element: MessageCodePage,
    title: '메시지코드관리',
    menuId: 'M0805',
  },

  // 시스템관리 > 환경설정
  {
    path: 'admin/configs',
    element: SysConfigPage,
    title: '환경설정',
    menuId: 'M0804',
  },

  // 공지사항 > 목록
  {
    path: 'notices',
    element: NoticeListPage,
    title: '공지사항',
    menuId: 'M0701',
  },

  // 공지사항 > 상세
  {
    path: 'notices/:noticeId',
    element: NoticeDetail,
    title: '공지사항상세',
  },

  // 공지사항 > 등록 (Admin)
  {
    path: 'admin/notices/create',
    element: NoticeFormPage,
    title: '공지사항등록',
  },

  // 공지사항 > 수정 (Admin)
  {
    path: 'admin/notices/edit/:noticeId',
    element: NoticeFormPage,
    title: '공지사항수정',
  },

  // 시스템관리 > 역할관리
  {
    path: 'admin/roles',
    element: lazy(() => import('@/pages/system/RolePage')),
    title: '역할관리',
    menuId: 'M0803',
  },

  // 시스템관리 > 배치관리
  {
    path: 'ops/batches',
    element: BatchManagementPage,
    title: '배치관리',
    menuId: 'M0806',
  },

  // 시스템관리 > 파일관리
  {
    path: 'admin/files',
    element: FileManagementPage,
    title: '파일관리',
    menuId: 'M0807',
  },

  // 실시간 채팅
  {
    path: 'chat',
    element: ChatPage,
    title: '실시간 채팅',
  },
];

export default routes;


