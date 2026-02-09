/**
 * Mock 메뉴 데이터
 * - 백엔드 API 미구현 시 사용
 * - MenuItem, MenuPermission 타입에 맞게 구성
 */
import type { MenuItem, MenuPermission, ApiResponse } from '@/types';
import { MenuResponse } from './menuService';

// Mock 메뉴 데이터
const mockMenus: MenuItem[] = [
  {
    menuId: 'M01',
    menuNm: '대시보드',
    menuLevel: 1,
    parentMenuId: null,
    menuUrl: '/dashboard',
    menuIcon: 'fa-tachometer-alt',
    sortOrder: 1,
    children: [],
  },
  {
    menuId: 'M02',
    menuNm: '신용평가',
    menuLevel: 1,
    parentMenuId: null,
    menuUrl: null,
    menuIcon: 'fa-chart-line',
    sortOrder: 2,
    children: [
      {
        menuId: 'M0200',
        menuNm: '대상자 목록',
        menuLevel: 2,
        parentMenuId: 'M02',
        menuUrl: '/persons',
        menuIcon: 'fa-users',
        sortOrder: 0,
        children: [],
      },
      {
        menuId: 'M0201',
        menuNm: '대상자등록',
        menuLevel: 2,
        parentMenuId: 'M02',
        menuUrl: '/persons/create',
        menuIcon: 'fa-user-plus',
        sortOrder: 1,
        children: [],
      },
      {
        menuId: 'M0202',
        menuNm: '대상자상세',
        menuLevel: 2,
        parentMenuId: 'M02',
        menuUrl: '/persons/detail',
        menuIcon: 'fa-id-card',
        sortOrder: 2,
        children: [],
      },
      {
        menuId: 'M0203',
        menuNm: '평가 실행',
        menuLevel: 2,
        parentMenuId: 'M02',
        menuUrl: '/credit/run',
        menuIcon: 'fa-play-circle',
        sortOrder: 3,
        children: [],
      },
      {
        menuId: 'M0204',
        menuNm: '점수 분포',
        menuLevel: 2,
        parentMenuId: 'M02',
        menuUrl: '/credit/distribution',
        menuIcon: 'fa-chart-bar',
        sortOrder: 4,
        children: [],
      },
      {
        menuId: 'M0205',
        menuNm: '관리그룹',
        menuLevel: 2,
        parentMenuId: 'M02',
        menuUrl: '/psngrp',
        menuIcon: 'fa-layer-group',
        sortOrder: 5,
        children: [],
      },
      {
        menuId: 'M0206',
        menuNm: '시뮬레이션',
        menuLevel: 2,
        parentMenuId: 'M02',
        menuUrl: '/simulation',
        menuIcon: 'fa-flask',
        sortOrder: 6,
        children: [],
      },
      {
        menuId: 'M0207',
        menuNm: '시뮬레이션이력',
        menuLevel: 2,
        parentMenuId: 'M02',
        menuUrl: '/simulation/history',
        menuIcon: 'fa-history',
        sortOrder: 7,
        children: [],
      },
    ],
  },
  {
    menuId: 'M04',
    menuNm: '분석관리',
    menuLevel: 1,
    parentMenuId: null,
    menuUrl: null,
    menuIcon: 'fa-database',
    sortOrder: 4,
    children: [
      {
        menuId: 'M0401',
        menuNm: '모델관리',
        menuLevel: 2,
        parentMenuId: 'M04',
        menuUrl: '/models',
        menuIcon: 'fa-sitemap',
        sortOrder: 1,
        children: [],
      },
      {
        menuId: 'M0402',
        menuNm: '기초데이터업로드',
        menuLevel: 2,
        parentMenuId: 'M04',
        menuUrl: '/admin/rawdata',
        menuIcon: 'fa-folder-open',
        sortOrder: 2,
        children: [],
      },
      {
        menuId: 'M0403',
        menuNm: '기초데이터조회',
        menuLevel: 2,
        parentMenuId: 'M04',
        menuUrl: '/admin/rawdata-list',
        menuIcon: 'fa-table',
        sortOrder: 3,
        children: [],
      },
      {
        menuId: 'M0404',
        menuNm: '데이터 분석',
        menuLevel: 2,
        parentMenuId: 'M04',
        menuUrl: '/analysis',
        menuIcon: 'fa-chart-bar',
        sortOrder: 4,
        children: [],
      },
      {
        menuId: 'M0405',
        menuNm: '시계열 분석',
        menuLevel: 2,
        parentMenuId: 'M04',
        menuUrl: '/analysis/time-series',
        menuIcon: 'fa-chart-line',
        sortOrder: 5,
        children: [],
      },
      {
        menuId: 'M0406',
        menuNm: '모델 선택',
        menuLevel: 2,
        parentMenuId: 'M04',
        menuUrl: '/analysis/model-select',
        menuIcon: 'fa-cubes',
        sortOrder: 6,
        children: [],
      },
      {
        menuId: 'M0409',
        menuNm: '변수 메타 관리',
        menuLevel: 2,
        parentMenuId: 'M04',
        menuUrl: '/admin/variables',
        menuIcon: 'fa-tags',
        sortOrder: 9,
        children: [],
      },
    ],
  },
  {
    menuId: 'M05',
    menuNm: '사용자관리',
    menuLevel: 1,
    parentMenuId: null,
    menuUrl: null,
    menuIcon: 'fa-users',
    sortOrder: 5,
    children: [
      {
        menuId: 'M0501',
        menuNm: '사용자목록',
        menuLevel: 2,
        parentMenuId: 'M05',
        menuUrl: '/users',
        menuIcon: 'fa-user-cog',
        sortOrder: 1,
        children: [],
      },
    ],
  },
  {
    menuId: 'M08',
    menuNm: '시스템관리',
    menuLevel: 1,
    parentMenuId: null,
    menuUrl: null,
    menuIcon: 'fa-cogs',
    sortOrder: 8,
    children: [
      {
        menuId: 'M0801',
        menuNm: '공통코드관리',
        menuLevel: 2,
        parentMenuId: 'M08',
        menuUrl: '/admin/codes',
        menuIcon: 'fa-tags',
        sortOrder: 1,
        children: [],
      },
      {
        menuId: 'M0802',
        menuNm: '메뉴관리',
        menuLevel: 2,
        parentMenuId: 'M08',
        menuUrl: '/admin/menus',
        menuIcon: 'fa-sitemap',
        sortOrder: 2,
        children: [],
      },
      {
        menuId: 'M0803',
        menuNm: '역할관리',
        menuLevel: 2,
        parentMenuId: 'M08',
        menuUrl: '/admin/roles',
        menuIcon: 'fa-user-shield',
        sortOrder: 3,
        children: [],
      },
    ],
  },
];

// Mock 권한 데이터
const mockPermissions: MenuPermission[] = mockMenus
  .flatMap((menu) => {
    const perms: MenuPermission[] = [
      {
        menuId: menu.menuId,
        canRead: true,
        canWrite: true,
        canDelete: true,
        exportYn: true,
      },
    ];
    if (menu.children) {
      menu.children.forEach((child) => {
        perms.push({
          menuId: child.menuId,
          canRead: true,
          canWrite: true,
          canDelete: true,
          exportYn: true,
        });
      });
    }
    return perms;
  });

export const mockMenuService = {
  getUserMenus: async (): Promise<ApiResponse<MenuResponse>> => {
    // 네트워크 지연 시뮬레이션
    await new Promise((resolve) => setTimeout(resolve, 300));

    return {
      success: true,
      errorCode: '',
      data: {
        menus: mockMenus,
        permissions: mockPermissions,
      },
      message: '메뉴 조회 성공',
    };
  },
};

export default mockMenuService;
