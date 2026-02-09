"""
Claude API 기반 신용평가 비교 분석 요약 서비스
"""
import json
import logging
import re
from datetime import datetime
from django.conf import settings

logger = logging.getLogger(__name__)


class AiAnalysisService:
    """Claude API를 활용한 실험군-대조군 비교 분석 요약 서비스"""

    def __init__(self):
        import anthropic
        api_key = getattr(settings, 'ANTHROPIC_API_KEY', None)
        if not api_key:
            raise ValueError("ANTHROPIC_API_KEY가 설정되지 않았습니다.")
        self.client = anthropic.Anthropic(api_key=api_key)
        self.model = getattr(settings, 'ANTHROPIC_MODEL', 'claude-sonnet-4-20250514')
        self.max_tokens = getattr(settings, 'ANTHROPIC_MAX_TOKENS', 2000)

    def generate_comparison_summary(self, exp_data, ctl_data, diff_data):
        """실험군-대조군 비교 분석 요약 생성"""
        exp_axes = exp_data.get('axes', [])
        ctl_axes = ctl_data.get('axes', [])

        prompt = self._build_prompt(exp_data, ctl_data, diff_data)

        try:
            message = self.client.messages.create(
                model=self.model,
                max_tokens=self.max_tokens,
                messages=[{"role": "user", "content": prompt}]
            )

            response_text = message.content[0].text

            # Extract JSON from response
            result = self._parse_json_response(response_text)
            result['generatedAt'] = datetime.now().isoformat()

            return result

        except Exception as e:
            logger.error(f'Claude API 호출 실패: {e}')
            # Return fallback analysis
            return self._generate_fallback_summary(exp_data, ctl_data, diff_data)

    def _build_prompt(self, exp_data, ctl_data, diff_data):
        """Claude API 프롬프트 생성"""
        exp_axes = exp_data.get('axes', [])
        ctl_axes = ctl_data.get('axes', [])

        axes_comparison = ""
        for i, axis in enumerate(exp_axes):
            ctl_val = ctl_axes[i]['value'] if i < len(ctl_axes) else 0
            diff_val = axis['value'] - ctl_val
            sign = '+' if diff_val > 0 else ''
            axes_comparison += f"        - {axis['axis']}: 실험군 {axis['value']:.1f} / 대조군 {ctl_val:.1f} (차이: {sign}{diff_val:.1f})\n"

        return f"""신용평가 스파이더웹(레이더 차트) 비교 분석 결과를 전문가 관점에서 분석해주세요.

        [실험군] {exp_data.get('label', '실험군')}
        - 대상: {exp_data.get('count', 0)}명
        - 평균 신용점수: {exp_data.get('avgScore', 0)}점 (등급: {exp_data.get('avgGrade', '-')})

        [대조군] {ctl_data.get('label', '대조군')}
        - 대상: {ctl_data.get('count', 0)}명
        - 평균 신용점수: {ctl_data.get('avgScore', 0)}점 (등급: {ctl_data.get('avgGrade', '-')})

        [6축 비교]
{axes_comparison}
        다음 JSON 형식으로만 응답해주세요 (다른 텍스트 없이 순수 JSON만):
        {{
            "summary": "종합 분석 텍스트 (3~5문장, 한국어)",
            "keyFindings": [
                {{ "category": "위험 요인 또는 긍정 요인", "finding": "구체적 발견 내용", "severity": "HIGH 또는 MEDIUM 또는 LOW" }}
            ],
            "recommendations": ["권고사항1", "권고사항2", "권고사항3"],
            "overallRisk": "HIGH 또는 MEDIUM_HIGH 또는 MEDIUM 또는 MEDIUM_LOW 또는 LOW"
        }}"""

    def _parse_json_response(self, text):
        """Claude 응답에서 JSON 추출"""
        text = text.strip()
        # Try direct parse
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            pass

        # Try to find JSON block
        json_match = re.search(r'\{[\s\S]*\}', text)
        if json_match:
            try:
                return json.loads(json_match.group())
            except json.JSONDecodeError:
                pass

        # Fallback
        return {
            "summary": text[:500],
            "keyFindings": [],
            "recommendations": [],
            "overallRisk": "MEDIUM"
        }

    def _generate_fallback_summary(self, exp_data, ctl_data, diff_data):
        """API 실패 시 기본 분석 요약 생성"""
        exp_axes = exp_data.get('axes', [])
        ctl_axes = ctl_data.get('axes', [])

        findings = []
        for i, axis in enumerate(exp_axes):
            if i < len(ctl_axes):
                diff = axis['value'] - ctl_axes[i]['value']
                if abs(diff) > 5:
                    category = '위험 요인' if diff > 0 else '긍정 요인'
                    severity = 'HIGH' if abs(diff) > 15 else 'MEDIUM' if abs(diff) > 10 else 'LOW'
                    sign = '+' if diff > 0 else ''
                    findings.append({
                        'category': category,
                        'finding': f"{axis['axis']} 축이 대조군 대비 {sign}{diff:.1f}p",
                        'severity': severity
                    })

        high_risk_count = sum(1 for f in findings if f['severity'] == 'HIGH')
        if high_risk_count >= 2:
            overall_risk = 'HIGH'
        elif high_risk_count >= 1:
            overall_risk = 'MEDIUM_HIGH'
        else:
            overall_risk = 'MEDIUM'

        return {
            'summary': f"{exp_data.get('label', '실험군')}의 신용 프로파일을 {ctl_data.get('label', '대조군')} 그룹과 비교 분석한 결과입니다.",
            'keyFindings': findings[:5],
            'recommendations': ['상세 분석을 위해 AI 분석을 재요청해 주세요.'],
            'overallRisk': overall_risk,
            'generatedAt': datetime.now().isoformat()
        }
