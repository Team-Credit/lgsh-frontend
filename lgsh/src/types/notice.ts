/**
 * 공지사항 관련 타입 정의
 */

export interface Notice {
    noticeId: number;
    title: string;
    content: string;
    lvl: '1' | '2' | '3';
    pinYn: 'Y' | 'N';
    useYn: 'Y' | 'N';
    startDt: string;
    endDt: string;
    viewCnt: number;
    regUserId: string;
    regDt: string;
    updUserId?: string;
    updDt?: string;
    expiredYn?: 'Y' | 'N';
}

export interface NoticeListParams {
    keyword?: string;
    page?: number;
    size?: number;
}

export interface NoticeCreateRequest {
    title: string;
    content: string;
    lvl: string;
    pinYn: string;
    useYn: string;
    startDt: string;
    endDt: string;
    regUserId?: string;
}

export interface NoticeUpdateRequest {
    title: string;
    content: string;
    lvl: string;
    pinYn: string;
    useYn: string;
    startDt: string;
    endDt: string;
    updUserId?: string;
}
