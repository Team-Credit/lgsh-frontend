export interface ChatAuditRequestCreate {
  startDate: string;
  endDate: string;
  keyword?: string;
  roomId?: string;
}

export interface ChatAuditRequestResponse {
  requestId: number;
  companyId: string;
  requestUserId: string;
  requestRoleId: string;
  roomId?: string;
  startDate: string;
  endDate: string;
  keyword?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  requestDt?: string;
  approveDt?: string;
  approveUserId?: string;
  approveComment?: string;
  useEs?: string;
  resultCount?: number;
  pdfFileNm?: string;
}

export interface ChatAuditApprovalRequest {
  approve: boolean;
  comment?: string;
}
