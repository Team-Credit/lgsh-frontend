/**
 * PSN-001 대상자 목록 카드보드 UI
 * [성능개선] Keyset(Seek) pagination 적용
 *   - 순차 페이지 이동: cursorMap 캐시 활용 → SP_PERSON_CARD_LIST_SEEK 호출 (항상 p_size건만 읽음)
 *   - 임의 페이지 이동 (cursor 캐시 없음): SP_PERSON_CARD_LIST (OFFSET fallback)
 *   - 검색/정렬/pageSize 변경: cursorMap 초기화 + needTotal='Y' 로 totalCount 재계산
 */
import React, { useEffect, useState, useRef } from 'react';
import {
  Card, Form, Input, Select, Button, Space, Typography, Pagination,
  Modal, Spin, Empty, message,
} from 'antd';
import { SearchOutlined, ReloadOutlined, TeamOutlined } from '@ant-design/icons';
import { personService } from '@/services/personService';
import { useAppSelector } from '@/store/hooks';
import { useCommonCodes } from '@/hooks';
import PersonCard from './components/PersonCard';
import PersonDetailData from './PersonDetailData';
import SimulationPage from '@/pages/simulation/SimulationPage';
import type { PersonCardItem } from '@/types';
import './CreditEvaluationTargetPage.css';

const { Title, Text } = Typography;
const { Option } = Select;

// 각 페이지의 시작 커서 (해당 페이지 첫 행에 도달하기 위한 직전 페이지 마지막 행 키값)
interface CursorState {
  cursorScore?: number;
  cursorScoreDt?: string;
  cursorRegDt?: string;
  cursorPersonId?: string;
}

const CreditEvaluationTargetPage: React.FC = () => {
  const [searchForm] = Form.useForm();

  // 로그인 사용자
  const currentUser = useAppSelector((state) => state.auth.user);
  const userCompanyId = currentUser?.companyId || null;

  // 공통코드: 등급
  const { codeMap } = useCommonCodes(['CREDIT_GRADE']);
  const gradeOptions = codeMap['CREDIT_GRADE'] || [];

  // 상태
  const [loading, setLoading] = useState(false);
  const [dataSource, setDataSource] = useState<PersonCardItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Keyset 커서 캐시: { [pageNum]: 해당 페이지 첫 행을 얻기 위한 커서 }
  // page 1 → cursor 없음(undefined), page 2 → page 1 마지막 행 키값, ...
  const cursorMapRef = useRef<Record<number, CursorState>>({});

  // 모달 상태
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailPersonId, setDetailPersonId] = useState('');
  const [simModalOpen, setSimModalOpen] = useState(false);
  const [simPersonId, setSimPersonId] = useState('');

  /**
   * 응답 마지막 행에서 커서 추출
   * 다음 페이지(currentPage+1)의 커서로 cursorMapRef에 저장
   */
  const saveNextCursor = (items: PersonCardItem[], currentPage: number, sortBy: string) => {
    if (items.length === 0) return;
    const last = items[items.length - 1];
    const cursor: CursorState = { cursorPersonId: last.personId };
    if (sortBy === 'RECENT') {
      cursor.cursorRegDt = last.scoreDt ?? undefined; // REG_DT는 현재 VO에 없어 scoreDt 대체 불가 → personId만 사용
    } else {
      cursor.cursorScore    = last.creditScore ?? undefined;
      cursor.cursorScoreDt  = last.scoreDt ?? undefined;
    }
    cursorMapRef.current[currentPage + 1] = cursor;
  };

  /**
   * 데이터 조회
   * - cursor 있으면 Keyset SP (card-list-seek)
   * - cursor 없고 1페이지가 아니면 OFFSET fallback (card-list)
   * - needTotal: 1페이지이거나 cursorMap 초기화 시 'Y'
   */
  const fetchData = async (
    currentPage = page,
    currentSize = pageSize,
    resetCursor = false,
  ) => {
    setLoading(true);
    try {
      const searchValues = searchForm.getFieldsValue();
      const { personId: _personId, ...restSearchValues } = searchValues;
      const personId = (searchValues.personId || '').trim();
      let personNo = (searchValues.personNo || '').trim();

      if (personId) {
        const personResponse = await personService.get(personId);
        if (!personResponse.success || !personResponse.data?.personNo) {
          setDataSource([]);
          setTotal(0);
          message.info('입력한 대상자ID를 찾을 수 없습니다.');
          return;
        }
        personNo = personResponse.data.personNo;
      }

      const commonParams = {
        ...restSearchValues,
        personNo: personNo || undefined,
        companyId: userCompanyId || searchValues.companyId,
        size: currentSize,
      };

      if (resetCursor) {
        cursorMapRef.current = {};
      }

      const cursor = currentPage === 1 ? undefined : cursorMapRef.current[currentPage];
      const useSeek = currentPage === 1 || cursor !== undefined;

      let response;
      if (useSeek) {
        // Keyset 방식: 첫 페이지이거나 cursor 캐시가 있을 때
        response = await personService.cardListSeek({
          ...commonParams,
          ...(cursor ?? {}),
          needTotal: (currentPage === 1 || resetCursor) ? 'Y' : 'N',
          page: currentPage - 1,
        });
      } else {
        // OFFSET fallback: 임의 페이지 클릭 시 cursor 캐시 없음
        response = await personService.cardList({
          ...commonParams,
          page: currentPage - 1,
        });
      }

      if (response.success && response.data) {
        const { content, totalCount } = response.data;
        setDataSource(content);

        // totalCount: needTotal='Y'일 때만 서버에서 계산 (0보다 크면 갱신)
        if (totalCount > 0) {
          setTotal(totalCount);
        }

        if (content.length === 0) {
          message.info('조회된 데이터가 없습니다.');
        } else {
          // 다음 페이지 cursor 저장
          saveNextCursor(content, currentPage, searchValues.sortBy || 'SCORE_DESC');
        }
      } else {
        message.error(response.message || '데이터 조회에 실패했습니다.');
      }
    } catch (error: any) {
      console.error('데이터 조회 오류:', error);
      message.error(error?.message || '데이터 조회 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 초기 로드
  useEffect(() => {
    fetchData(1, pageSize, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 검색 (cursorMap 초기화 + totalCount 재계산)
  const handleSearch = () => {
    setPage(1);
    fetchData(1, pageSize, true);
  };

  // 초기화
  const handleReset = () => {
    searchForm.resetFields();
    searchForm.setFieldsValue({ sortBy: 'SCORE_DESC' });
    setPage(1);
    fetchData(1, pageSize, true);
  };

  // 상세보기 모달
  const handleDetailClick = (personId: string) => {
    setDetailPersonId(personId);
    setDetailModalOpen(true);
  };

  // 시뮬레이션 모달
  const handleSimulationClick = (personId: string) => {
    setSimPersonId(personId);
    setSimModalOpen(true);
  };

  // 페이지 변경
  const handlePageChange = (newPage: number, newSize: number) => {
    const sizeChanged = newSize !== pageSize;
    setPage(newPage);
    setPageSize(newSize);
    // 페이지 크기 변경 시 cursorMap 초기화
    fetchData(newPage, newSize, sizeChanged);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="person-card-page">
      {/* 페이지 헤더 */}
      <div className="page-header">
        <Title level={4} style={{ margin: 0, marginBottom: 4 }}>
          <TeamOutlined style={{ marginRight: 8 }} />
          대상자 목록
        </Title>
        <Text type="secondary" style={{ fontSize: 13 }}>
          신용평가 대상자를 카드보드 형태로 조회합니다.
        </Text>
      </div>

      {/* 조회조건 */}
      <Card className="search-card" size="small">
        <Form form={searchForm} layout="inline" initialValues={{ sortBy: 'SCORE_DESC' }}>
          <Form.Item name="personId" label="대상자ID">
            <Input placeholder="대상자ID" style={{ width: 150 }} />
          </Form.Item>
          <Form.Item name="personNo" label="대상자번호">
            <Input placeholder="대상자번호" style={{ width: 150 }} />
          </Form.Item>
          <Form.Item name="personNm" label="대상자명">
            <Input placeholder="대상자명" style={{ width: 150 }} />
          </Form.Item>
          {!userCompanyId && (
            <Form.Item name="companyId" label="원청사">
              <Input placeholder="원청사ID" style={{ width: 130 }} />
            </Form.Item>
          )}
          <Form.Item name="personGrp" label="관리그룹">
            <Input placeholder="관리그룹" style={{ width: 130 }} />
          </Form.Item>
          <Form.Item name="useYn" label="사용여부">
            <Select placeholder="전체" allowClear style={{ width: 100 }}>
              <Option value="Y">사용</Option>
              <Option value="N">미사용</Option>
            </Select>
          </Form.Item>
          <Form.Item name="creditGrade" label="등급">
            <Select placeholder="전체" allowClear style={{ width: 120 }}>
              {gradeOptions.map((opt) => (
                <Option key={opt.value} value={opt.value}>{opt.label}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="sortBy" label="정렬">
            <Select style={{ width: 140 }}>
              <Option value="SCORE_DESC">점수 높은 순</Option>
              <Option value="SCORE_ASC">점수 낮은 순</Option>
              <Option value="RECENT">최신순</Option>
            </Select>
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
                조회
              </Button>
              <Button icon={<ReloadOutlined />} onClick={handleReset}>
                초기화
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>

      {/* 결과 영역 */}
      <div className="result-header">
        <Text type="secondary">전체 {total.toLocaleString()}건</Text>
      </div>

      {loading ? (
        <div className="loading-container">
          <Spin size="large" tip="조회 중..." />
        </div>
      ) : dataSource.length === 0 ? (
        <div className="empty-container">
          <Empty description="조회된 데이터가 없습니다" />
        </div>
      ) : (
        <>
          {/* 카드 그리드 */}
          <div className="person-card-grid" role="list">
            {dataSource.map((item) => (
              <PersonCard
                key={item.personId}
                item={item}
                onDetailClick={handleDetailClick}
                onSimulationClick={handleSimulationClick}
              />
            ))}
          </div>

          {/* 페이지네이션 (UI 기존 유지) */}
          <div className="pagination-wrapper">
            <Pagination
              current={page}
              pageSize={pageSize}
              total={total}
              showSizeChanger
              pageSizeOptions={['12', '20', '40', '60']}
              showTotal={(t) => `전체 ${t.toLocaleString()}건`}
              onChange={handlePageChange}
            />
          </div>
        </>
      )}

      {/* 상세보기 모달 */}
      <Modal
        title={null}
        open={detailModalOpen}
        onCancel={() => setDetailModalOpen(false)}
        footer={null}
        width={900}
        destroyOnClose
        centered
        style={{ top: 20 }}
      >
        <div style={{ padding: '0px' }}>
          <PersonDetailData personId={detailPersonId} />
        </div>
      </Modal>

      {/* 시뮬레이션 모달 */}
      <Modal
        title="시뮬레이션 실행"
        open={simModalOpen}
        onCancel={() => setSimModalOpen(false)}
        footer={null}
        width={1000}
        destroyOnClose
        centered
        style={{ top: 20 }}
      >
        <div style={{ padding: '0px', maxHeight: '80vh', overflow: 'auto' }}>
          <SimulationPage personId={simPersonId} embedded />
        </div>
      </Modal>
    </div>
  );
};

export default CreditEvaluationTargetPage;
