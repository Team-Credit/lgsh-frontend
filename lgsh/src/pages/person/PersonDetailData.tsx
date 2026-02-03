import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '@/services/api';
import './PersonDetailData.css';

interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  message: string | null;
  errorCode: string | null;
}

interface PersonDetailResponseDto {
  personId: string;
  personNm: string;
  personNo: string;
  mobileNo: string;
  email: string;
  personGrpNm: string;
  jobCode: string;
  annualIncome: number | null;
  marriageYn: string;
  address: string;
  creditScore: number | null;
  creditGrade: string;
  scoreDt: string;
}

interface PersonDetailDataProps {
  personId?: string;
}

const PersonDetailData: React.FC<PersonDetailDataProps> = ({ personId }) => {
  const navigate = useNavigate();
  const params = useParams();
  const resolvedPersonId = personId || params.personId || '';
  const [data, setData] = useState<PersonDetailResponseDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [inputPersonId, setInputPersonId] = useState('');

  const formattedIncome = useMemo(() => {
    if (!data?.annualIncome && data?.annualIncome !== 0) return '-';
    return `${new Intl.NumberFormat('ko-KR').format(data.annualIncome)} 원`;
  }, [data?.annualIncome]);

  useEffect(() => {
    if (!resolvedPersonId) {
      setErrorMessage(null);
      setData(null);
      return;
    }

    const fetchDetail = async () => {
      setLoading(true);
      setErrorMessage(null);
      try {
        const response = await api.get<ApiResponse<PersonDetailResponseDto>>(
          `/persons/${resolvedPersonId}/detail`
        );
        if (response.data.success && response.data.data) {
          setData(response.data.data);
        } else {
          setErrorMessage(response.data.message || '대상자 상세 조회에 실패했습니다.');
        }
      } catch (error: any) {
        setErrorMessage(
          error?.response?.data?.message || error?.message || '대상자 상세 조회에 실패했습니다.'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [resolvedPersonId]);

  if (!resolvedPersonId) {
    return (
      <div className="person-detail-container">
        {/* 페이지 헤더 */}
        <div className="page-header" style={{ marginBottom: 20 }}>
          <h2 style={{ margin: 0, marginBottom: 4, fontSize: 18, fontWeight: 600, color: 'var(--text-primary, #1a1a2e)' }}>
            📋 대상자 상세정보
          </h2>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary, #666)' }}>
            선택한 대상자의 기본정보, 신용평가 결과, 상세정보를 한눈에 확인할 수 있습니다.
          </p>
        </div>

        {/* 검색 카드 */}
        <div className="search-card" style={{
          background: 'var(--card-background, #fff)',
          borderRadius: 8,
          padding: 20,
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          marginBottom: 20
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <label style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary, #333)' }}>
              대상자 ID
            </label>
            <input
              className="person-detail-input"
              style={{
                padding: '8px 12px',
                border: '1px solid var(--border-color, #d9d9d9)',
                borderRadius: 6,
                fontSize: 14,
                width: 200
              }}
              value={inputPersonId}
              onChange={(e) => setInputPersonId(e.target.value)}
              placeholder="예: 1000001"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const trimmed = inputPersonId.trim();
                  if (trimmed) {
                    navigate(`/persons/detail/${trimmed}`);
                  } else {
                    setErrorMessage('대상자 ID를 입력하세요.');
                  }
                }
              }}
            />
            <button
              style={{
                padding: '8px 20px',
                background: '#1e3a8a',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                fontSize: 14,
                fontWeight: 500,
                cursor: 'pointer'
              }}
              onClick={() => {
                const trimmed = inputPersonId.trim();
                if (trimmed) {
                  navigate(`/persons/detail/${trimmed}`);
                } else {
                  setErrorMessage('대상자 ID를 입력하세요.');
                }
              }}
            >
              조회
            </button>
          </div>
          {errorMessage && (
            <div style={{ marginTop: 12, color: 'var(--error-color, #ff4d4f)', fontSize: 13 }}>
              {errorMessage}
            </div>
          )}
        </div>

        {/* 안내 메시지 */}
        <div style={{
          background: 'var(--info-background, #f6f8fa)',
          borderRadius: 8,
          padding: 40,
          textAlign: 'center',
          color: 'var(--text-secondary, #666)'
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>👤</div>
          <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 8 }}>대상자를 조회해 주세요</div>
          <div style={{ fontSize: 13 }}>
            상단의 검색창에 대상자 ID를 입력하고 조회 버튼을 클릭하세요.
          </div>
        </div>
      </div>
    );
  }

  // 공통 페이지 헤더
  const pageHeader = (
    <div className="page-header" style={{ marginBottom: 20 }}>
      <h2 style={{ margin: 0, marginBottom: 4, fontSize: 18, fontWeight: 600, color: 'var(--text-primary, #1a1a2e)' }}>
        📋 대상자 상세정보
      </h2>
      <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary, #666)' }}>
        선택한 대상자의 기본정보, 신용평가 결과, 상세정보를 한눈에 확인할 수 있습니다.
      </p>
    </div>
  );

  if (loading) {
    return (
      <div className="person-detail-container">
        {pageHeader}
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
        {pageHeader}
        <div className="person-detail-state error">
          <span>{errorMessage}</span>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="person-detail-container">
        {pageHeader}
        <div className="person-detail-state">
          <span>대상자 정보가 없습니다.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="person-detail-container">
      {/* 페이지 헤더 */}
      <div className="page-header" style={{ marginBottom: 20 }}>
        <h2 style={{ margin: 0, marginBottom: 4, fontSize: 18, fontWeight: 600, color: 'var(--text-primary, #1a1a2e)' }}>
          📋 대상자 상세정보
        </h2>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary, #666)' }}>
          선택한 대상자의 기본정보, 신용평가 결과, 상세정보를 한눈에 확인할 수 있습니다.
        </p>
      </div>

      <div className="person-detail-header">
        <div>
          <div className="person-title">대상자 360° 상세</div>
          <div className="person-subtitle">기본 정보 및 최신 평가 요약</div>
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
            <span className="label">연락처</span>
            <span className="value">{data.mobileNo || '-'}</span>
          </div>
          <div className="card-row">
            <span className="label">관리그룹</span>
            <span className="value">{data.personGrpNm || '-'}</span>
          </div>
          <div className="card-row">
            <span className="label">이메일</span>
            <span className="value">{data.email || '-'}</span>
          </div>
        </div>

        <div className="person-card highlight">
          <div className="card-title">최신 신용평가</div>
          <div className="score-box">
            <div className="score-value">{data.creditScore ?? '-'}</div>
            <div className="score-unit">점</div>
          </div>
          <div className="grade-badge">{data.creditGrade || '-'}</div>
          <div className="card-row">
            <span className="label">평가일</span>
            <span className="value">{data.scoreDt || '-'}</span>
          </div>
        </div>
      </div>

      <div className="person-detail-grid bottom">
        <div className="person-card">
          <div className="card-title">상세 정보</div>
          <div className="card-row">
            <span className="label">직업 코드</span>
            <span className="value">{data.jobCode || '-'}</span>
          </div>
          <div className="card-row">
            <span className="label">연 소득</span>
            <span className="value">{formattedIncome}</span>
          </div>
          <div className="card-row">
            <span className="label">혼인 여부</span>
            <span className="value">{data.marriageYn || '-'}</span>
          </div>
          <div className="card-row">
            <span className="label">주소</span>
            <span className="value">{data.address || '-'}</span>
          </div>
        </div>

        <div className="person-card">
          <div className="card-title">최근 평가 이력</div>
          <table className="history-table">
            <thead>
              <tr>
                <th>평가일</th>
                <th>점수</th>
                <th>등급</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{data.scoreDt || '-'}</td>
                <td>{data.creditScore ?? '-'}</td>
                <td>{data.creditGrade || '-'}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PersonDetailData;
