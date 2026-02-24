/**
 * 태그 입력 Popover 컴포넌트
 * 조건 유형 선택 후 값을 선택하여 해시태그 추가
 */
import React, { useState } from 'react';
import { Popover, Button, Select, Space, Radio, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import type { HashTag, HashTagType, FilterOptionsResponse, PersonSearchItem } from '@/types/spider';
import { TAG_COLORS } from '@/types/spider';
import spiderService from '@/services/spiderService';

interface Props {
  group: 'experiment' | 'control';
  filterOptions: FilterOptionsResponse | null;
  onAdd: (tag: HashTag) => void;
  existingTypes: HashTagType[];
  companyId?: string;
}

const TAG_TYPE_OPTIONS = [
  { value: 'person', label: '대상자' },
  { value: 'age', label: '나이대' },
  { value: 'gender', label: '성별' },
  { value: 'region', label: '지역' },
  { value: 'job', label: '직업군' },
  { value: 'income', label: '연봉 구간' },
];

const TagInput: React.FC<Props> = ({ group, filterOptions, onAdd, existingTypes, companyId }) => {
  const [open, setOpen] = useState(false);
  const [tagType, setTagType] = useState<HashTagType | null>(null);
  const [selectedValue, setSelectedValue] = useState<string>('');
  const [selectedLabel, setSelectedLabel] = useState<string>('');
  const [personOptions, setPersonOptions] = useState<PersonSearchItem[]>([]);
  const [personSearching, setPersonSearching] = useState(false);
  const [personSearched, setPersonSearched] = useState(false);

  const availableTypes = TAG_TYPE_OPTIONS.filter((opt) => {
    return !existingTypes.includes(opt.value as HashTagType);
  });

  const handlePersonSearch = async (keyword: string) => {
    if (!keyword || keyword.length < 2) {
      setPersonOptions([]);
      setPersonSearched(false);
      return;
    }
    setPersonSearching(true);
    setPersonSearched(true);
    try {
      const response = await spiderService.searchPerson(keyword, companyId);
      if (response.success && response.data) {
        setPersonOptions(response.data);
      } else {
        setPersonOptions([]);
        if (response.message) {
          message.warning(response.message);
        }
      }
    } catch (error: any) {
      setPersonOptions([]);
      const errMsg = error?.response?.data?.message || '대상자 검색 중 오류가 발생했습니다.';
      message.error(errMsg);
    } finally {
      setPersonSearching(false);
    }
  };

  const handleApply = () => {
    if (!tagType || !selectedValue) return;
    const tag: HashTag = {
      id: `${group}-${tagType}-${Date.now()}`,
      type: tagType,
      label: selectedLabel,
      value: selectedValue,
      color: TAG_COLORS[tagType],
    };
    onAdd(tag);
    handleReset();
  };

  const handleReset = () => {
    setTagType(null);
    setSelectedValue('');
    setSelectedLabel('');
    setOpen(false);
  };

  const renderValueSelector = () => {
    if (!tagType) return null;

    // person 타입은 filterOptions 없이도 검색 가능
    if (tagType === 'person') {
      const notFoundMsg = personSearching
        ? '검색 중...'
        : personSearched
          ? '검색 결과가 없습니다'
          : '2글자 이상 입력하여 검색하세요';
      return (
        <Select
          showSearch
          placeholder="이름 또는 ID로 검색 (2글자 이상)"
          filterOption={false}
          onSearch={handlePersonSearch}
          loading={personSearching}
          notFoundContent={<span style={{ color: '#999', fontSize: 12 }}>{notFoundMsg}</span>}
          onChange={(val, opt: any) => {
            setSelectedValue(val);
            setSelectedLabel(opt?.label || val);
          }}
          style={{ width: '100%' }}
          options={personOptions.map((p) => ({
            value: p.personId,
            label: `${p.personNm} (${p.personId})`,
          }))}
        />
      );
    }

    if (!filterOptions) return null;

    switch (tagType) {
      case 'age':
        return (
          <Radio.Group
            onChange={(e) => {
              const item = filterOptions.ageGroups.find((a) => a.value === e.target.value);
              setSelectedValue(e.target.value);
              setSelectedLabel(item?.label || e.target.value);
            }}
            value={selectedValue}
            style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
          >
            {filterOptions.ageGroups.map((opt) => (
              <Radio key={opt.value} value={opt.value}>{opt.label}</Radio>
            ))}
          </Radio.Group>
        );
      case 'gender':
        return (
          <Radio.Group
            onChange={(e) => {
              const item = filterOptions.genders.find((g) => g.value === e.target.value);
              setSelectedValue(e.target.value);
              setSelectedLabel(item?.label || e.target.value);
            }}
            value={selectedValue}
            style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
          >
            {filterOptions.genders.map((opt) => (
              <Radio key={opt.value} value={opt.value}>{opt.label}</Radio>
            ))}
          </Radio.Group>
        );
      case 'region':
        return (
          <Select
            showSearch
            placeholder="지역 선택"
            onChange={(val) => {
              const item = filterOptions.regions.find((r) => r.value === val);
              setSelectedValue(val);
              setSelectedLabel(item?.label || val);
            }}
            value={selectedValue || undefined}
            style={{ width: '100%' }}
            options={filterOptions.regions.map((r) => ({ value: r.value, label: r.label }))}
          />
        );
      case 'job':
        return (
          <Select
            showSearch
            placeholder="직업군 선택"
            onChange={(val) => {
              const item = filterOptions.jobCodes.find((j) => j.value === val);
              setSelectedValue(val);
              setSelectedLabel(item?.label || val);
            }}
            value={selectedValue || undefined}
            style={{ width: '100%' }}
            options={filterOptions.jobCodes.map((j) => ({ value: j.value, label: j.label }))}
          />
        );
      case 'income':
        return (
          <Radio.Group
            onChange={(e) => {
              const item = filterOptions.incomeRanges.find((i) => i.value === e.target.value);
              setSelectedValue(e.target.value);
              setSelectedLabel(item?.label || e.target.value);
            }}
            value={selectedValue}
            style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
          >
            {filterOptions.incomeRanges.map((opt) => (
              <Radio key={opt.value} value={opt.value}>{opt.label}</Radio>
            ))}
          </Radio.Group>
        );
      default:
        return null;
    }
  };

  const content = (
    <div style={{ width: 260 }}>
      <div style={{ marginBottom: 12 }}>
        <div style={{ marginBottom: 6, fontWeight: 500, color: 'var(--text, #0f172a)' }}>유형</div>
        <Select
          placeholder="조건 유형 선택"
          onChange={(val) => {
            setTagType(val as HashTagType);
            setSelectedValue('');
            setSelectedLabel('');
          }}
          value={tagType}
          style={{ width: '100%' }}
          options={availableTypes}
        />
      </div>
      {tagType && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ marginBottom: 6, fontWeight: 500, color: 'var(--text, #0f172a)' }}>
            {TAG_TYPE_OPTIONS.find((o) => o.value === tagType)?.label} 선택
          </div>
          {renderValueSelector()}
        </div>
      )}
      <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
        <Button size="small" onClick={handleReset}>취소</Button>
        <Button size="small" type="primary" onClick={handleApply} disabled={!selectedValue}>적용</Button>
      </Space>
    </div>
  );

  return (
    <Popover
      content={content}
      title="조건 선택"
      trigger="click"
      open={open}
      onOpenChange={setOpen}
      placement="bottomLeft"
    >
      <Button
        type="dashed"
        size="small"
        icon={<PlusOutlined />}
        style={{ borderRadius: 16, fontSize: 12 }}
      >
        태그 추가
      </Button>
    </Popover>
  );
};

export default TagInput;
