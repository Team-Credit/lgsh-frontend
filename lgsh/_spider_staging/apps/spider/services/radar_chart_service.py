"""
matplotlib 기반 레이더 차트 생성 서비스
"""
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.font_manager as fm
import io
import os
import logging
from typing import Dict, List, Optional

logger = logging.getLogger(__name__)

# Korean font setup
def _setup_korean_font():
    font_candidates = ['NanumGothic', 'Malgun Gothic', 'AppleGothic', 'Noto Sans KR']
    for font_name in font_candidates:
        font_path = fm.findfont(fm.FontProperties(family=font_name))
        if font_path and os.path.exists(font_path):
            plt.rcParams['font.family'] = font_name
            plt.rcParams['axes.unicode_minus'] = False
            return
    plt.rcParams['axes.unicode_minus'] = False

_setup_korean_font()


class RadarChartService:
    """레이더 차트 생성 서비스"""

    AXIS_LABELS = ['연체 이력', '부채 수준', '비금융 정보', '대출 정보', '신용 형태', '신용 거래\n기간']
    EXP_COLOR = '#4096FF'
    CTL_COLOR = '#FF6B6B'
    EXP_FILL = (64/255, 150/255, 255/255, 0.2)
    CTL_FILL = (255/255, 107/255, 107/255, 0.2)

    def create_single_radar(self, axes_data: List[Dict], color: str, fill_color: tuple,
                            title: str, subtitle: str) -> bytes:
        """단독 레이더 차트 생성"""
        fig, ax = plt.subplots(figsize=(5, 5), subplot_kw=dict(polar=True))

        values = [d.get('value', 0) for d in axes_data]
        values.append(values[0])

        num_axes = len(self.AXIS_LABELS)
        angles = np.linspace(0, 2 * np.pi, num_axes, endpoint=False).tolist()
        angles.append(angles[0])

        ax.plot(angles, values, 'o-', color=color, linewidth=2, markersize=6)
        ax.fill(angles, values, color=fill_color)

        ax.set_thetagrids(np.degrees(angles[:-1]), self.AXIS_LABELS, fontsize=10)
        ax.set_ylim(0, 100)
        ax.set_yticks([20, 40, 60, 80, 100])
        ax.set_yticklabels(['20', '40', '60', '80', '100'], fontsize=8, color='gray')
        ax.set_title(f'{title}\n{subtitle}', fontsize=13, fontweight='bold', pad=20)

        buf = io.BytesIO()
        plt.savefig(buf, format='png', dpi=150, bbox_inches='tight',
                    facecolor='white', edgecolor='none')
        plt.close(fig)
        buf.seek(0)
        return buf.getvalue()

    def create_overlay_radar(self, exp_data: List[Dict], ctl_data: List[Dict],
                             exp_label: str, ctl_label: str) -> bytes:
        """겹침 레이더 차트 생성"""
        fig, ax = plt.subplots(figsize=(5, 5), subplot_kw=dict(polar=True))

        exp_values = [d.get('value', 0) for d in exp_data] + [exp_data[0].get('value', 0)]
        ctl_values = [d.get('value', 0) for d in ctl_data] + [ctl_data[0].get('value', 0)]

        num_axes = len(self.AXIS_LABELS)
        angles = np.linspace(0, 2 * np.pi, num_axes, endpoint=False).tolist()
        angles.append(angles[0])

        ax.plot(angles, exp_values, 'o-', color=self.EXP_COLOR, linewidth=2,
                markersize=5, label=exp_label)
        ax.fill(angles, exp_values, color=self.EXP_FILL)

        ax.plot(angles, ctl_values, 'o-', color=self.CTL_COLOR, linewidth=2,
                markersize=5, label=ctl_label)
        ax.fill(angles, ctl_values, color=self.CTL_FILL)

        ax.set_thetagrids(np.degrees(angles[:-1]), self.AXIS_LABELS, fontsize=10)
        ax.set_ylim(0, 100)
        ax.set_yticks([20, 40, 60, 80, 100])
        ax.set_yticklabels(['20', '40', '60', '80', '100'], fontsize=8, color='gray')
        ax.set_title('겹침 비교', fontsize=13, fontweight='bold', pad=20)
        ax.legend(loc='upper right', bbox_to_anchor=(1.3, 1.1), fontsize=10)

        buf = io.BytesIO()
        plt.savefig(buf, format='png', dpi=150, bbox_inches='tight',
                    facecolor='white', edgecolor='none')
        plt.close(fig)
        buf.seek(0)
        return buf.getvalue()

    def create_all_charts(self, exp_data: List[Dict], ctl_data: List[Dict],
                          exp_label: str, ctl_label: str,
                          exp_subtitle: str, ctl_subtitle: str) -> Dict[str, bytes]:
        """3개 차트 모두 생성"""
        return {
            'experiment': self.create_single_radar(exp_data, self.EXP_COLOR, self.EXP_FILL,
                                                    '실험군', exp_subtitle),
            'control': self.create_single_radar(ctl_data, self.CTL_COLOR, self.CTL_FILL,
                                                 '대조군', ctl_subtitle),
            'overlay': self.create_overlay_radar(exp_data, ctl_data, exp_label, ctl_label),
        }
