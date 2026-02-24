/**
 * 해시태그 필터 컨테이너 컴포넌트
 * 분석 대상/비교 기준 조건을 해시태그 형태로 선택
 * 분석 대상과 비교 기준에 독립적인 년월 선택 지원
 */
import React from 'react';
import { Card, DatePicker, Typography } from 'antd';
import dayjs from 'dayjs';
import TagChip from './TagChip';
import TagInput from './TagInput';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import {
  setYearMonth,
  setCtlYearMonth,
  addExpTag,
  removeExpTag,
  addCtlTag,
  removeCtlTag,
} from '@/store/slices/spiderSlice';
import type { HashTag } from '@/types/spider';
import { TAG_COLORS } from '@/types/spider';
import './styles.css';

const { Text } = Typography;

const HashTagFilter: React.FC = () => {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const { year, month, ctlYear, ctlMonth, expTags, ctlTags, filterOptions } = useAppSelector(
    (state) => state.spider
  );

  /** 분석 대상 년월 변경 */
  const handleExpYearMonthChange = (_: any, dateString: string | string[]) => {
    if (typeof dateString === 'string' && dateString) {
      const [y, m] = dateString.split('-').map(Number);
      dispatch(setYearMonth({ year: y, month: m }));
    }
  };

  /** 비교 기준 년월 변경 */
  const handleCtlYearMonthChange = (_: any, dateString: string | string[]) => {
    if (typeof dateString === 'string' && dateString) {
      const [y, m] = dateString.split('-').map(Number);
      dispatch(setCtlYearMonth({ year: y, month: m }));
    }
  };

  /** 분석 대상 년월 태그 */
  const expYearMonthTag: HashTag = {
    id: 'yearMonth-exp',
    type: 'yearMonth',
    label: `${year}-${String(month).padStart(2, '0')}`,
    value: `${year}-${String(month).padStart(2, '0')}`,
    color: TAG_COLORS.yearMonth,
  };

  /** 비교 기준 년월 태그 */
  const ctlYearMonthTag: HashTag = {
    id: 'yearMonth-ctl',
    type: 'yearMonth',
    label: `${ctlYear}-${String(ctlMonth).padStart(2, '0')}`,
    value: `${ctlYear}-${String(ctlMonth).padStart(2, '0')}`,
    color: '#FF6B6B',
  };

  return (
    <Card className="spider-filter-card" size="small">
      {/* 분석 대상 섹션 */}
      <div className="spider-filter-section">
        <div className="spider-filter-label">
          <Text strong style={{ color: '#4096FF' }}>분석 대상 조건</Text>
          <DatePicker
            picker="month"
            value={dayjs(`${year}-${String(month).padStart(2, '0')}`, 'YYYY-MM')}
            onChange={handleExpYearMonthChange}
            allowClear={false}
            size="small"
            style={{ width: 130, marginLeft: 8 }}
          />
        </div>
        <div className="spider-filter-tags">
          <TagChip tag={expYearMonthTag} onRemove={() => {}} closable={false} />
          {expTags.map((tag) => (
            <TagChip key={tag.id} tag={tag} onRemove={(id) => dispatch(removeExpTag(id))} />
          ))}
          <TagInput
            key="exp-input"
            group="experiment"
            filterOptions={filterOptions}
            onAdd={(tag) => dispatch(addExpTag(tag))}
            existingTypes={expTags.map((t) => t.type)}
            companyId={user?.companyId}
          />
        </div>
      </div>

      {/* 비교 기준 섹션 */}
      <div className="spider-filter-section">
        <div className="spider-filter-label">
          <Text strong style={{ color: '#FF6B6B' }}>비교 기준 조건</Text>
          <DatePicker
            picker="month"
            value={dayjs(`${ctlYear}-${String(ctlMonth).padStart(2, '0')}`, 'YYYY-MM')}
            onChange={handleCtlYearMonthChange}
            allowClear={false}
            size="small"
            style={{ width: 130, marginLeft: 8 }}
          />
        </div>
        <div className="spider-filter-tags">
          <TagChip tag={ctlYearMonthTag} onRemove={() => {}} closable={false} />
          {ctlTags.map((tag) => (
            <TagChip key={tag.id} tag={tag} onRemove={(id) => dispatch(removeCtlTag(id))} />
          ))}
          <TagInput
            key="ctl-input"
            group="control"
            filterOptions={filterOptions}
            onAdd={(tag) => dispatch(addCtlTag(tag))}
            existingTypes={ctlTags.map((t) => t.type)}
            companyId={user?.companyId}
          />
        </div>
      </div>
    </Card>
  );
};

export default HashTagFilter;
