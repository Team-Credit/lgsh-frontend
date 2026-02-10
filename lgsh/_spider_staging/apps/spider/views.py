"""
스파이더웹 분석 API 뷰
- AI 비교 분석 요약 생성 (Claude API)
- 레이더 차트 PDF 생성 (matplotlib + ReportLab)
"""
import logging
from rest_framework import permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from common.responses import success, error

from .services.ai_analysis_service import AiAnalysisService
from .services.pdf_service import PdfService

logger = logging.getLogger(__name__)


class SpiderAiSummaryView(APIView):
    """AI 비교 분석 요약 생성"""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        try:
            data = request.data
            exp_data = data.get('experiment')
            ctl_data = data.get('control')
            diff_data = data.get('diff')

            if not exp_data or not ctl_data:
                return error('ERR_SWB_001', '실험군/대조군 데이터가 필요합니다.', status=400)

            service = AiAnalysisService()
            result = service.generate_comparison_summary(exp_data, ctl_data, diff_data)

            return success(result, code='SUC_SWB_001', message='AI 분석 요약이 생성되었습니다.', status=200)

        except Exception as e:
            logger.error(f'AI 분석 요약 생성 실패: {e}', exc_info=True)
            return error('ERR_SWB_004', f'AI 분석에 실패했습니다: {str(e)}', status=500)


class SpiderPdfView(APIView):
    """레이더 차트 PDF 생성"""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        try:
            data = request.data
            exp_data = data.get('experiment')
            ctl_data = data.get('control')
            diff_data = data.get('diff')
            ai_summary = data.get('aiSummary')
            title = data.get('title', '신용평가 비교 분석 보고서')
            year = data.get('year')
            month = data.get('month')

            if not exp_data or not ctl_data:
                return error('ERR_SWB_001', '실험군/대조군 데이터가 필요합니다.', status=400)

            service = PdfService()
            result = service.generate_pdf(
                exp_data=exp_data,
                ctl_data=ctl_data,
                diff_data=diff_data,
                ai_summary=ai_summary,
                title=title,
                year=year,
                month=month
            )

            return success(result, code='SUC_SWB_002', message='PDF가 생성되었습니다.', status=200)

        except Exception as e:
            logger.error(f'PDF 생성 실패: {e}', exc_info=True)
            return error('ERR_SWB_005', f'PDF 생성에 실패했습니다: {str(e)}', status=500)
