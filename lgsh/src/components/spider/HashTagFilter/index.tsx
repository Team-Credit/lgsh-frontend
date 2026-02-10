/**
 * 해시태그 필터 컨테이너 컴포넌트
 * 분석 대상/비교 기준 조건을 해시태그 형태로 선택
 */
import React from 'react';
import { Card, DatePicker, Typography } from 'antd';
import dayjs from 'dayjs';
import TagChip from './TagChip';
import TagInput from './TagInput';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import {
  setYearMonth,
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
  const { year, month, expTags, ctlTags, filterOptions } = useAppSelector(
    (state) => state.spider
  );

  const handleYearMonthChange = (_: any, dateString: string | string[]) => {
    if (typeof dateString === 'string' && dateString) {
      const [y, m] = dateString.split('-').map(Number);
      dispatch(setYearMonth({ year: y, month: m }));
    }
  };

  const yearMonthTag: HashTag = {
    id: 'yearMonth-fixed',
    type: 'yearMonth',
    label: `${year}-${String(month).padStart(2, '0')}`,
    value: `${year}-${String(month).padStart(2, '0')}`,
    color: TAG_COLORS.yearMonth,
  };

  return (
    <Card className="spider-filter-card" size="small">
      <div className="spider-filter-header">
        <Text strong style={{ fontSize: 14 }}>조회 기준 년월</Text>
        <DatePicker
          picker="month"
          value={dayjs(`${year}-${String(month).padStart(2, '0')}`, 'YYYY-MM')}
          onChange={handleYearMonthChange}
          allowClear={false}
          style={{ width: 160 }}
        />
      </div>

      <div className="spider-filter-section">
        <div className="spider-filter-label">
          <Text strong style={{ color: '#4096FF' }}>분석 대상 조건</Text>
        </div>
        <div className="spider-filter-tags">
          <TagChip tag={yearMonthTag} onRemove={() => {}} closable={false} />
          {expTags.map((tag) => (
            <TagChip key={tag.id} tag={tag} onRemove={(id) => dispatch(removeExpTag(id))} />
          ))}
          <TagInput
            group="experiment"
            filterOptions={filterOptions}
            onAdd={(tag) => dispatch(addExpTag(tag))}
            existingTypes={expTags.map((t) => t.type)}
            companyId={user?.companyId}
          />
        </div>
      </div>

      <div className="spider-filter-section">
        <div className="spider-filter-label">
          <Text strong style={{ color: '#FF6B6B' }}>비교 기준 조건</Text>
        </div>
        <div className="spider-filter-tags">
          <TagChip tag={yearMonthTag} onRemove={() => {}} closable={false} />
          {ctlTags.map((tag) => (
            <TagChip key={tag.id} tag={tag} onRemove={(id) => dispatch(removeCtlTag(id))} />
          ))}
          <TagInput
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
