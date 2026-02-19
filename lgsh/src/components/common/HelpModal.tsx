/**
 * 도움말 모달 컴포넌트
 * 현재 메뉴에 대한 사용자 도움말을 표시합니다.
 * help/data/{menuKey}.json 파일을 동적으로 로드합니다.
 */
import React, { useState, useEffect } from 'react';
import { Modal, Typography, Collapse, Tag, Divider, Empty, Spin } from 'antd';
import {
  QuestionCircleOutlined,
  InfoCircleOutlined,
  BulbOutlined,
} from '@ant-design/icons';

const { Text, Paragraph } = Typography;

interface HelpItem {
  label: string;
  description: string;
}

interface HelpSection {
  title: string;
  description: string;
  items?: HelpItem[];
}

interface HelpData {
  title: string;
  description: string;
  sections: HelpSection[];
  tips?: string[];
}

interface HelpModalProps {
  open: boolean;
  onClose: () => void;
  menuKey: string | null;
}

const helpDataModules = import.meta.glob('../../help/data/*.json');

const HelpModal: React.FC<HelpModalProps> = ({ open, onClose, menuKey }) => {
  const [helpData, setHelpData] = useState<HelpData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && menuKey) {
      setLoading(true);
      setHelpData(null);

      const loader = helpDataModules[`../../help/data/${menuKey}.json`];

      if (!loader) {
        setHelpData(null);
        setLoading(false);
        return;
      }

      loader()
        .then((data) => {
          setHelpData(data.default || data);
        })
        .catch(() => {
          setHelpData(null);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [open, menuKey]);

  // Collapse items 구성
  const collapseItems = helpData?.sections?.map((section, idx) => ({
    key: String(idx),
    label: (
      <Text strong style={{ fontSize: 15 }}>
        {section.title}
      </Text>
    ),
    children: (
      <>
        <Paragraph type="secondary" style={{ marginBottom: 12 }}>
          {section.description}
        </Paragraph>
        {section.items?.map((item, itemIdx) => (
          <div
            key={itemIdx}
            style={{
              marginBottom: 10,
              paddingLeft: 12,
              borderLeft: '3px solid #1890ff',
            }}
          >
            <Text strong>{item.label}</Text>
            <br />
            <Text type="secondary">{item.description}</Text>
          </div>
        ))}
      </>
    ),
  }));

  return (
    <Modal
      title={
        <span>
          <QuestionCircleOutlined style={{ marginRight: 8, color: '#1890ff' }} />
          {helpData?.title || '도움말'}
        </span>
      }
      open={open}
      onCancel={onClose}
      footer={null}
      width={720}
      destroyOnClose
      styles={{ body: { maxHeight: '70vh', overflowY: 'auto' } }}
    >
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Spin size="large" />
        </div>
      ) : helpData ? (
        <>
          {/* 화면 설명 */}
          <Paragraph type="secondary" style={{ fontSize: 14, marginBottom: 16 }}>
            <InfoCircleOutlined style={{ marginRight: 6 }} />
            {helpData.description}
          </Paragraph>

          <Divider style={{ margin: '12px 0' }} />

          {/* 영역별 설명 */}
          <Collapse
            defaultActiveKey={helpData.sections?.map((_, i) => String(i))}
            ghost
            items={collapseItems}
          />

          {/* 사용 팁 */}
          {helpData.tips && helpData.tips.length > 0 && (
            <>
              <Divider style={{ margin: '12px 0' }} />
              <div>
                <Text strong style={{ fontSize: 14 }}>
                  <BulbOutlined style={{ marginRight: 6, color: '#faad14' }} />
                  사용 팁
                </Text>
                <div style={{ marginTop: 8 }}>
                  {helpData.tips.map((tip, idx) => (
                    <Tag
                      key={idx}
                      color="blue"
                      style={{
                        marginBottom: 6,
                        padding: '4px 10px',
                        fontSize: 13,
                        whiteSpace: 'normal',
                        height: 'auto',
                        lineHeight: '1.5',
                      }}
                    >
                      {tip}
                    </Tag>
                  ))}
                </div>
              </div>
            </>
          )}
        </>
      ) : (
        <Empty description="도움말 정보가 없습니다." />
      )}
    </Modal>
  );
};

export default HelpModal;
