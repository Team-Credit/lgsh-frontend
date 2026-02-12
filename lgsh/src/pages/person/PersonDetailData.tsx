import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Typography } from 'antd';
import { SolutionOutlined } from '@ant-design/icons';
import api from '@/services/api';
import './PersonDetailData.css';

const { Title, Text } = Typography;

interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  message?: string | null;
  code?: string | null;
  errorCode?: string | null;
}

interface PersonDetailResponse {
  personId: string;
  personNm: string;
  personNo: string;
  mobileNo: string;
  email: string;
  personGrpNm: string;
  regDt?: string | null;
  marriageYn?: string | null;
  jobCode?: string | null;
  annualIncome?: number | null;
  address?: string | null;
  notes?: string | null;
  creditScore?: number | null;
  creditGrade?: string | null;
  scoreDt?: string | null;
}

interface ScoreHistoryItem {
  scoreSeq: number;
  evalDt: string;
  creditScore: number | null;
  creditGrade: string | null;
  scoreReason: string | null;
}

interface PageResponse<T> {
  content: T[];
  totalCount: number;
  page: number;
  size: number;
}

interface PersonDetailDataProps {
  personId?: string;
}

const formatDate = (value?: string | null): string => {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value.slice(0, 10) || '-';
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
};

const ynText = (v?: string | null): string => {
  if (!v) return '-';
  const t = String(v).trim().toUpperCase();
  if (t === 'Y') return '예';
  if (t === 'N') return '아니오';
  return v;
};

/** 등급별 색상 (글자색) */
const GRADE_COLOR: Record<string, string> = {
  A: '#1D4ED8',
  B: '#16A34A',
  C: '#FACC15',
  D: '#F97316',
  E: '#EF4444',
};

/** 등급별 연한 배경 (라이트모드) */
const GRADE_BG_LIGHT: Record<string, string> = {
  A: '#EFF6FF',  // blue-50
  B: '#F0FDF4',  // green-50
  C: '#FEFCE8',  // yellow-50
  D: '#FFF7ED',  // orange-50
  E: '#FEF2F2',  // red-50
};

/** 등급별 보더 (라이트모드) */
const GRADE_BORDER_LIGHT: Record<string, string> = {
  A: '#BFDBFE',  // blue-200
  B: '#BBF7D0',  // green-200
  C: '#FEF08A',  // yellow-200
  D: '#FED7AA',  // orange-200
  E: '#FECACA',  // red-200
};

/** 등급별 어두운 배경 (다크모드) */
const GRADE_BG_DARK: Record<string, string> = {
  A: '#1E293B',
  B: '#14332A',
  C: '#2A2517',
  D: '#2A1F17',
  E: '#2A1717',
};

/** 등급별 라벨 */
const GRADE_LABEL: Record<string, string> = {
  A: '최우수',
  B: '우수',
  C: '보통',
  D: '주의',
  E: '위험',
};

const getGradeKey = (grade: string): string => {
  const g = grade.trim().toUpperCase().charAt(0);
  return ['A', 'B', 'C', 'D', 'E'].includes(g) ? g : '';
};

const PersonDetailData: React.FC<PersonDetailDataProps> = ({ personId }) => {
  const navigate = useNavigate();
  const params = useParams();

  const resolvedPersonId = (personId || params.personId || '').trim();
  const [inputPersonId, setInputPersonId] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [data, setData] = useState<PersonDetailResponse | null>(null);
  const [history, setHistory] = useState<ScoreHistoryItem[]>([]);

  const formattedIncome = useMemo(() => {
    const v = data?.annualIncome;
    if (v === null || v === undefined) return '-';
    return `${new Intl.NumberFormat('ko-KR').format(v)}원`;
  }, [data?.annualIncome]);

  useEffect(() => {
    if (!resolvedPersonId) {
      setData(null);
      setHistory([]);
      setErrorMessage(null);
      return;
    }

    const fetchDetail = async () => {
      setLoading(true);
      setErrorMessage(null);
      try {
        const [detailRes, histRes] = await Promise.all([
          api.get<ApiResponse<PersonDetailResponse>>(`/persons/${resolvedPersonId}/details`),
          api.get<ApiResponse<PageResponse<ScoreHistoryItem>>>(`/persons/${resolvedPersonId}/history`, {
            params: { page: 1, size: 10 },
          }),
        ]);

        if (detailRes.data?.success && detailRes.data.data) {
          setData(detailRes.data.data);
        } else {
          setData(null);
          setErrorMessage(detailRes.data?.message || '대상자 상세 조회에 실패했습니다.');
        }

        if (histRes.data?.success && histRes.data.data) {
          setHistory(histRes.data.data.content || []);
        } else {
          setHistory([]);
        }
      } catch (e: any) {
        setData(null);
        setHistory([]);
        setErrorMessage(e?.response?.data?.message || e?.message || '대상자 상세 조회에 실패했습니다.');
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [resolvedPersonId]);

  if (!resolvedPersonId) {
    return (
      <div className="person-detail-container">
        <div className="page-header">
          <Title level={4} style={{ margin: 0, marginBottom: 4 }}>
            <SolutionOutlined style={{ marginRight: 8 }} />
            대상자 상세정보
          </Title>
          <Text type="secondary">대상자 ID를 입력하면 기본정보와 최신 신용평가 요약을 확인할 수 있습니다.</Text>
        </div>

        <div className="person-detail-search-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <label className="search-label">대상자 ID</label>
            <input
              className="person-detail-input"
              value={inputPersonId}
              onChange={(e) => setInputPersonId(e.target.value)}
              placeholder="예: 1000001"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const trimmed = inputPersonId.trim();
                  if (trimmed) navigate(`/persons/detail/${trimmed}`);
                  else setErrorMessage('대상자 ID를 입력해주세요.');
                }
              }}
            />
            <button
              className="person-detail-button"
              onClick={() => {
                const trimmed = inputPersonId.trim();
                if (trimmed) navigate(`/persons/detail/${trimmed}`);
                else setErrorMessage('대상자 ID를 입력해주세요.');
              }}
            >
              조회
            </button>
          </div>
          {errorMessage && <div className="person-detail-error">{errorMessage}</div>}
        </div>

        <div className="person-detail-empty">
          <div className="empty-title">대상자를 조회해주세요</div>
          <div className="empty-desc">상단 검색에서 대상자 ID를 입력해 상세정보를 확인할 수 있습니다.</div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="person-detail-container">
        <div className="person-detail-state">
          <div className="spinner" />
          <span>데이터를 불러오는 중입니다...</span>
        </div>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="person-detail-container">
        <div className="person-detail-state error">
          <span>{errorMessage}</span>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="person-detail-container">
        <div className="person-detail-state">
          <span>대상자 정보가 없습니다.</span>
        </div>
      </div>
    );
  }

  const score = data.creditScore ?? null;
  const grade = (data.creditGrade || '').trim() || '-';
  const gradeKey = getGradeKey(grade);
  const gradeColor = gradeKey ? GRADE_COLOR[gradeKey] : '#64748b';
  const gradeLabel = gradeKey ? GRADE_LABEL[gradeKey] : '미평가';

  return (
    <div className="person-detail-container">
      <div className="person-detail-header">
        <div>
          <Title level={4} style={{ margin: 0, marginBottom: 4 }}>
            <SolutionOutlined style={{ marginRight: 8 }} />
            대상자 상세정보
          </Title>
          <Text type="secondary">기본 정보 및 최신 신용평가 요약</Text>
        </div>
        <div className="person-id">ID: {data.personId}</div>
      </div>

      <div className="person-detail-grid">
        <div className="person-card">
          <div className="card-title">기본 프로필</div>
          <div className="card-row">
            <span className="label">이름</span>
            <span className="value">{data.personNm || '-'}</span>
          </div>
          <div className="card-row">
            <span className="label">대상자번호</span>
            <span className="value">{data.personNo || '-'}</span>
          </div>
          <div className="card-row">
            <span className="label">휴대폰</span>
            <span className="value">{data.mobileNo || '-'}</span>
          </div>
          <div className="card-row">
            <span className="label">이메일</span>
            <span className="value">{data.email || '-'}</span>
          </div>
          <div className="card-row">
            <span className="label">관리그룹</span>
            <span className="value">{data.personGrpNm || '-'}</span>
          </div>
          <div className="card-row">
            <span className="label">등록일</span>
            <span className="value">{formatDate(data.regDt)}</span>
          </div>
        </div>

        <div
          className={`person-card highlight${gradeKey ? ` grade-${gradeKey}` : ''}`}
          style={gradeKey ? {
            '--grade-color': gradeColor,
            '--grade-bg': GRADE_BG_LIGHT[gradeKey],
            '--grade-border': GRADE_BORDER_LIGHT[gradeKey],
            '--grade-bg-dark': GRADE_BG_DARK[gradeKey],
          } as React.CSSProperties : undefined}
        >
          <div className="card-title">신용평가 요약</div>
          <div className="score-box">
            <div className="score-value" style={{ color: gradeColor }}>
              {score === null ? '-' : score}
            </div>
            <div className="score-unit">점</div>
          </div>
          <div
            className="grade-badge"
            style={{
              background: `${gradeColor}18`,
              color: gradeColor,
              border: `1.5px solid ${gradeColor}55`,
            }}
          >
            {grade}등급 · {gradeLabel}
          </div>
          <div className="card-row">
            <span className="label">평가일</span>
            <span className="value">{formatDate(data.scoreDt)}</span>
          </div>
        </div>
      </div>

      <div className="person-detail-grid bottom">
        <div className="person-card">
          <div className="card-title">상세 정보</div>
          <div className="card-row">
            <span className="label">혼인여부</span>
            <span className="value">{ynText(data.marriageYn)}</span>
          </div>
          <div className="card-row">
            <span className="label">직업코드</span>
            <span className="value">{data.jobCode || '-'}</span>
          </div>
          <div className="card-row">
            <span className="label">연소득</span>
            <span className="value">{formattedIncome}</span>
          </div>
          <div className="card-row">
            <span className="label">주소</span>
            <span className="value">{data.address || '-'}</span>
          </div>
          <div className="card-row">
            <span className="label">메모</span>
            <span className="value">{data.notes || '-'}</span>
          </div>
        </div>

        <div className="person-card">
          <div className="card-title">점수 이력</div>
          {history.length === 0 ? (
            <div style={{ fontSize: 13 }} className="person-subtitle">점수 이력이 없습니다.</div>
          ) : (
            <table className="history-table">
              <thead>
                <tr>
                  <th>평가일</th>
                  <th>점수</th>
                  <th>등급</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => {
                  const hGrade = getGradeKey((h.creditGrade || '').trim());
                  const hColor = hGrade ? GRADE_COLOR[hGrade] : undefined;
                  return (
                    <tr key={h.scoreSeq}>
                      <td>{formatDate(h.evalDt)}</td>
                      <td style={hColor ? { color: hColor, fontWeight: 600 } : undefined}>
                        {h.creditScore ?? '-'}
                      </td>
                      <td>
                        {hGrade ? (
                          <span
                            className="grade-badge-sm"
                            style={{
                              color: hColor,
                              background: `${hColor}15`,
                              border: `1px solid ${hColor}40`,
                            }}
                          >
                            {hGrade}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default PersonDetailData;

