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
  personName: string;
  personNo: string;
  mobileNo: string;
  email: string;
  groupName: string;
  jobCode: string;
  annualIncome: number | null;
  marriageYn: string;
  address: string;
  latestScore: number | null;
  latestGrade: string;
  evalDt: string;
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
          `/persons/${resolvedPersonId}/details`
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
      <div className="person-detail-state">
        <div style={{ marginBottom: 8 }}>대상자 ID를 입력하세요.</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            className="person-detail-input"
            value={inputPersonId}
            onChange={(e) => setInputPersonId(e.target.value)}
            placeholder="예: 1000001"
          />
          <button
            className="person-detail-button"
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
        {errorMessage && <div className="person-detail-error">{errorMessage}</div>}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="person-detail-state">
        <div className="spinner" />
        <span>데이터를 불러오는 중입니다...</span>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="person-detail-state error">
        <span>{errorMessage}</span>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="person-detail-state">
        <span>대상자 정보가 없습니다.</span>
      </div>
    );
  }

  return (
    <div className="person-detail-container">
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
            <span className="value">{data.personName || '-'}</span>
          </div>
          <div className="card-row">
            <span className="label">연락처</span>
            <span className="value">{data.mobileNo || '-'}</span>
          </div>
          <div className="card-row">
            <span className="label">관리그룹</span>
            <span className="value">{data.groupName || '-'}</span>
          </div>
          <div className="card-row">
            <span className="label">이메일</span>
            <span className="value">{data.email || '-'}</span>
          </div>
        </div>

        <div className="person-card highlight">
          <div className="card-title">최신 신용평가</div>
          <div className="score-box">
            <div className="score-value">{data.latestScore ?? '-'}</div>
            <div className="score-unit">점</div>
          </div>
          <div className="grade-badge">{data.latestGrade || '-'}</div>
          <div className="card-row">
            <span className="label">평가일</span>
            <span className="value">{data.evalDt || '-'}</span>
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
                <td>{data.evalDt || '-'}</td>
                <td>{data.latestScore ?? '-'}</td>
                <td>{data.latestGrade || '-'}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PersonDetailData;
