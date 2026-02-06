import api from './api';
import type { ApiResponse } from '@/types/common';
import type { ChatAuditApprovalRequest, ChatAuditRequestCreate, ChatAuditRequestResponse } from '@/types/chatAudit';

const BASE_URL = '/chat/audit';

export const chatAuditService = {
  createRequest: (data: ChatAuditRequestCreate) =>
    api.post<ApiResponse<number>>(`${BASE_URL}/requests`, data),

  listRequests: (status?: string) =>
    api.get<ApiResponse<ChatAuditRequestResponse[]>>(`${BASE_URL}/requests`, {
      params: status ? { status } : {},
    }),

  approveRequest: (requestId: number, data: ChatAuditApprovalRequest) =>
    api.post<ApiResponse<ChatAuditRequestResponse>>(`${BASE_URL}/requests/${requestId}/approve`, data),

  downloadRequestPdf: (requestId: number) =>
    api.get(`${BASE_URL}/requests/${requestId}/download`, { responseType: 'blob' }),
};

export default chatAuditService;
