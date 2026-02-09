/**
 * 해시태그 칩 컴포넌트
 */
import React from 'react';
import { Tag } from 'antd';
import type { HashTag } from '@/types/spider';

interface Props {
  tag: HashTag;
  onRemove: (tagId: string) => void;
  closable?: boolean;
}

const TagChip: React.FC<Props> = ({ tag, onRemove, closable = true }) => (
  <Tag
    color={tag.color}
    closable={closable}
    onClose={() => onRemove(tag.id)}
    style={{ fontSize: 13, padding: '4px 10px', borderRadius: 16, marginBottom: 4 }}
  >
    #{tag.label}
  </Tag>
);

export default TagChip;
