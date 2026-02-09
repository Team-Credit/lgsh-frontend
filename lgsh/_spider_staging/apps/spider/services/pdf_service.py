"""
ReportLab 기반 PDF 생성 서비스
"""
import base64
import io
import logging
from datetime import datetime
from typing import Dict, List, Optional

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm, cm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image, PageBreak
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

from .radar_chart_service import RadarChartService

logger = logging.getLogger(__name__)


def _register_korean_font():
    """한글 폰트 등록"""
    import os
    font_paths = [
        'C:/Windows/Fonts/malgun.ttf',
        'C:/Windows/Fonts/NanumGothic.ttf',
        '/usr/share/fonts/truetype/nanum/NanumGothic.ttf',
    ]
    for path in font_paths:
        if os.path.exists(path):
            font_name = 'KoreanFont'
            try:
                pdfmetrics.registerFont(TTFont(font_name, path))
                return font_name
            except Exception:
                continue
    return 'Helvetica'

KOREAN_FONT = _register_korean_font()


class PdfService:
    """PDF 생성 서비스"""

    def generate_pdf(self, exp_data, ctl_data, diff_data, ai_summary=None,
                     title='신용평가 비교 분석 보고서', year=None, month=None):
        """PDF 생성 후 base64로 반환"""
        buf = io.BytesIO()
        doc = SimpleDocTemplate(buf, pagesize=A4,
                                topMargin=2*cm, bottomMargin=2*cm,
                                leftMargin=2*cm, rightMargin=2*cm)

        styles = getSampleStyleSheet()
        korean_style = ParagraphStyle(
            'Korean', parent=styles['Normal'],
            fontName=KOREAN_FONT, fontSize=10, leading=14
        )
        title_style = ParagraphStyle(
            'KoreanTitle', parent=styles['Title'],
            fontName=KOREAN_FONT, fontSize=18, leading=22, alignment=TA_CENTER
        )
        heading_style = ParagraphStyle(
            'KoreanHeading', parent=styles['Heading2'],
            fontName=KOREAN_FONT, fontSize=14, leading=18
        )

        elements = []

        # Title
        elements.append(Paragraph(title, title_style))
        date_str = f"{year}년 {month}월" if year and month else datetime.now().strftime('%Y년 %m월')
        elements.append(Paragraph(f"분석 기준: {date_str}", korean_style))
        elements.append(Spacer(1, 12*mm))

        # Radar charts
        chart_service = RadarChartService()
        exp_axes = exp_data.get('axes', [])
        ctl_axes = ctl_data.get('axes', [])
        exp_label = exp_data.get('label', '실험군')
        ctl_label = ctl_data.get('label', '대조군')

        if exp_axes and ctl_axes:
            charts = chart_service.create_all_charts(
                exp_axes, ctl_axes,
                exp_label, ctl_label,
                f"{exp_data.get('count', 0)}명 / 점수: {exp_data.get('avgScore', 0)}",
                f"{ctl_data.get('count', 0)}명 / 점수: {ctl_data.get('avgScore', 0)}"
            )

            # Add charts as images
            for chart_name, chart_bytes in charts.items():
                img = Image(io.BytesIO(chart_bytes), width=14*cm, height=14*cm)
                elements.append(img)
                elements.append(Spacer(1, 5*mm))

        # Comparison table
        elements.append(Paragraph('축별 비교 상세', heading_style))
        elements.append(Spacer(1, 5*mm))

        table_data = [['카테고리', '실험군', '대조군', '차이']]
        axis_names = ['연체 이력', '부채 수준', '비금융 정보', '대출 정보', '신용 형태', '신용 거래 기간']
        for i, name in enumerate(axis_names):
            exp_val = exp_axes[i]['value'] if i < len(exp_axes) else 0
            ctl_val = ctl_axes[i]['value'] if i < len(ctl_axes) else 0
            diff_val = exp_val - ctl_val
            sign = '+' if diff_val > 0 else ''
            arrow = ' \u25b2' if diff_val > 0 else ' \u25bc' if diff_val < 0 else ''
            table_data.append([name, f'{exp_val:.1f}', f'{ctl_val:.1f}', f'{sign}{diff_val:.1f}{arrow}'])

        table = Table(table_data, colWidths=[5*cm, 3*cm, 3*cm, 3*cm])
        table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (-1, -1), KOREAN_FONT),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#003366')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F5F5F5')]),
        ]))
        elements.append(table)
        elements.append(Spacer(1, 10*mm))

        # AI Summary
        if ai_summary:
            elements.append(Paragraph('AI 분석 요약', heading_style))
            elements.append(Spacer(1, 5*mm))

            summary_text = ai_summary.get('summary', '') if isinstance(ai_summary, dict) else str(ai_summary)
            elements.append(Paragraph(summary_text, korean_style))
            elements.append(Spacer(1, 5*mm))

            key_findings = ai_summary.get('keyFindings', []) if isinstance(ai_summary, dict) else []
            if key_findings:
                elements.append(Paragraph('[주요 발견]', korean_style))
                for finding in key_findings:
                    if isinstance(finding, dict):
                        severity_icon = {'HIGH': '\u25cf', 'MEDIUM': '\u25cf', 'LOW': '\u25cf'}.get(finding.get('severity', ''), '\u25cf')
                        elements.append(Paragraph(
                            f"  {severity_icon} [{finding.get('category', '')}] {finding.get('finding', '')}",
                            korean_style
                        ))
                elements.append(Spacer(1, 5*mm))

            recommendations = ai_summary.get('recommendations', []) if isinstance(ai_summary, dict) else []
            if recommendations:
                elements.append(Paragraph('[권고사항]', korean_style))
                for rec in recommendations:
                    elements.append(Paragraph(f"  - {rec}", korean_style))

        # Build PDF
        doc.build(elements)
        buf.seek(0)
        pdf_bytes = buf.getvalue()

        pdf_base64 = base64.b64encode(pdf_bytes).decode('utf-8')
        file_name = f"spider_analysis_{year}_{month}.pdf" if year and month else f"spider_analysis_{datetime.now().strftime('%Y%m%d')}.pdf"

        return {
            'pdfBase64': pdf_base64,
            'fileName': file_name,
            'fileSize': len(pdf_bytes),
            'pageCount': 1
        }
