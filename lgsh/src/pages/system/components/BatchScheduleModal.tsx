/**
 * 배치 스케줄 등록/수정 모달
 */
import React, { useState, useEffect } from 'react';
import {
  Modal,
  Form,
  Input,
  Select,
  Radio,
  TimePicker,
  InputNumber,
  Switch,
  Space,
  Typography,
  message,
} from 'antd';
import type { BatchSchedule, BatchScheduleRequest, ScheduleType } from '@/types/batch';
import { SCHEDULE_TYPE_LABEL } from '@/types/batch';
import { batchService } from '@/services/batchService';
import {
  buildCronExpression,
  cronToReadable,
  isValidCron,
  parseCronExpression,
  DAY_OF_WEEK_LABELS,
} from '@/utils/cronHelper';
import dayjs from 'dayjs';

const { Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

interface BatchScheduleModalProps {
  open: boolean;
  editRecord: BatchSchedule | null;
  batchTypes: { value: string; label: string }[];
  onClose: () => void;
  onSaved: () => void;
}

const BatchScheduleModal: React.FC<BatchScheduleModalProps> = ({
  open,
  editRecord,
  batchTypes,
  onClose,
  onSaved,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [scheduleType, setScheduleType] = useState<ScheduleType>('DAILY');
  const [cronPreview, setCronPreview] = useState('');

  const isEdit = !!editRecord;

  // 모달 열릴 때 초기값 설정
  useEffect(() => {
    if (!open) return;

    if (editRecord) {
      // 수정 모드: 기존 값 세팅
      const parsed = parseCronExpression(editRecord.cronExpression);
      const sType = parsed?.scheduleType || 'CRON';

      form.setFieldsValue({
        batchType: editRecord.batchType,
        scheduleName: editRecord.scheduleName,
        scheduleType: sType,
        time: dayjs().hour(parsed?.hour ?? 0).minute(parsed?.minute ?? 0),
        dayOfWeek: parsed?.dayOfWeek ?? 1,
        dayOfMonth: parsed?.dayOfMonth ?? 1,
        cronExpression: editRecord.cronExpression,
        useYn: editRecord.useYn === 'Y',
        description: editRecord.description,
      });
      setScheduleType(sType);
      setCronPreview(cronToReadable(editRecord.cronExpression));
    } else {
      // 등록 모드: 초기값
      form.resetFields();
      form.setFieldsValue({
        scheduleType: 'DAILY',
        time: dayjs().hour(2).minute(0),
        dayOfWeek: 1,
        dayOfMonth: 1,
        useYn: true,
      });
      setScheduleType('DAILY');
      setCronPreview(cronToReadable('0 0 2 * * ?'));
    }
  }, [open, editRecord, form]);

  // Cron 미리보기 업데이트
  const updateCronPreview = () => {
    const values = form.getFieldsValue();
    const type = values.scheduleType as ScheduleType;
    const time = values.time as dayjs.Dayjs;
    const hour = time?.hour() ?? 0;
    const minute = time?.minute() ?? 0;

    let cron = '';
    if (type === 'CRON') {
      cron = values.cronExpression || '';
    } else {
      cron = buildCronExpression(type, hour, minute, values.dayOfWeek, values.dayOfMonth);
    }

    setCronPreview(cron ? cronToReadable(cron) : '');
  };

  // 스케줄 유형 변경
  const handleScheduleTypeChange = (value: ScheduleType) => {
    setScheduleType(value);
    setTimeout(updateCronPreview, 0);
  };

  // 저장
  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const type = values.scheduleType as ScheduleType;
      const time = values.time as dayjs.Dayjs;
      const hour = time?.hour() ?? 0;
      const minute = time?.minute() ?? 0;

      let cronExpression = '';
      if (type === 'CRON') {
        cronExpression = values.cronExpression;
      } else {
        cronExpression = buildCronExpression(type, hour, minute, values.dayOfWeek, values.dayOfMonth);
      }

      if (!isValidCron(cronExpression)) {
        message.error('유효하지 않은 Cron 표현식입니다.');
        return;
      }

      const request: BatchScheduleRequest = {
        batchType: values.batchType,
        scheduleName: values.scheduleName,
        scheduleType: type,
        cronExpression,
        useYn: values.useYn ? 'Y' : 'N',
        description: values.description,
      };

      setLoading(true);
      if (isEdit && editRecord) {
        await batchService.updateSchedule(editRecord.scheduleSeq, request);
        message.success('스케줄이 수정되었습니다.');
      } else {
        await batchService.createSchedule(request);
        message.success('스케줄이 등록되었습니다.');
      }

      onSaved();
      onClose();
    } catch (error: any) {
      if (error?.errorFields) return; // 폼 유효성 검사 실패
      if (error?.response?.data?.message) {
        message.error(error.response.data.message);
      } else {
        message.error('스케줄 저장에 실패했습니다.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={isEdit ? '스케줄 수정' : '스케줄 등록'}
      open={open}
      onOk={handleSave}
      onCancel={onClose}
      okText={isEdit ? '수정' : '등록'}
      cancelText="취소"
      confirmLoading={loading}
      width={560}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        style={{ marginTop: 16 }}
      >
        {/* 배치 유형 */}
        <Form.Item
          name="batchType"
          label="배치 유형"
          rules={[{ required: true, message: '배치 유형을 선택해주세요.' }]}
        >
          <Select placeholder="배치 유형 선택">
            {batchTypes.map((opt) => (
              <Option key={opt.value} value={opt.value}>
                {opt.label}
              </Option>
            ))}
          </Select>
        </Form.Item>

        {/* 스케줄명 */}
        <Form.Item
          name="scheduleName"
          label="스케줄명"
          rules={[{ required: true, message: '스케줄명을 입력해주세요.' }]}
        >
          <Input placeholder="예: 아카이브 매일 새벽 2시" maxLength={100} />
        </Form.Item>

        {/* 스케줄 유형 */}
        <Form.Item
          name="scheduleType"
          label="실행 주기"
          rules={[{ required: true, message: '실행 주기를 선택해주세요.' }]}
        >
          <Radio.Group onChange={(e) => handleScheduleTypeChange(e.target.value)}>
            {Object.entries(SCHEDULE_TYPE_LABEL).map(([key, label]) => (
              <Radio.Button key={key} value={key}>
                {label}
              </Radio.Button>
            ))}
          </Radio.Group>
        </Form.Item>

        {/* 시간 선택 (DAILY, WEEKLY, MONTHLY) */}
        {scheduleType !== 'CRON' && (
          <Form.Item
            name="time"
            label="실행 시간"
            rules={[{ required: true, message: '실행 시간을 선택해주세요.' }]}
          >
            <TimePicker
              format="HH:mm"
              minuteStep={5}
              style={{ width: '100%' }}
              onChange={() => setTimeout(updateCronPreview, 0)}
            />
          </Form.Item>
        )}

        {/* 요일 선택 (WEEKLY) */}
        {scheduleType === 'WEEKLY' && (
          <Form.Item
            name="dayOfWeek"
            label="요일"
            rules={[{ required: true, message: '요일을 선택해주세요.' }]}
          >
            <Select onChange={() => setTimeout(updateCronPreview, 0)}>
              {Object.entries(DAY_OF_WEEK_LABELS).map(([key, label]) => (
                <Option key={key} value={Number(key)}>
                  {label}
                </Option>
              ))}
            </Select>
          </Form.Item>
        )}

        {/* 일 선택 (MONTHLY) */}
        {scheduleType === 'MONTHLY' && (
          <Form.Item
            name="dayOfMonth"
            label="일"
            rules={[{ required: true, message: '일을 입력해주세요.' }]}
          >
            <InputNumber
              min={1}
              max={31}
              style={{ width: '100%' }}
              onChange={() => setTimeout(updateCronPreview, 0)}
            />
          </Form.Item>
        )}

        {/* Cron 직접 입력 */}
        {scheduleType === 'CRON' && (
          <Form.Item
            name="cronExpression"
            label="Cron 표현식"
            rules={[{ required: true, message: 'Cron 표현식을 입력해주세요.' }]}
            extra="Spring Cron 형식: 초 분 시 일 월 요일 (예: 0 0 2 * * ?)"
          >
            <Input
              placeholder="0 0 2 * * ?"
              style={{ fontFamily: 'monospace' }}
              onChange={() => setTimeout(updateCronPreview, 0)}
            />
          </Form.Item>
        )}

        {/* Cron 미리보기 */}
        {cronPreview && (
          <div
            style={{
              background: '#f5f5f5',
              padding: '8px 12px',
              borderRadius: 6,
              marginBottom: 16,
              border: '1px solid #d9d9d9',
            }}
          >
            <Space direction="vertical" size={2}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                실행 주기 미리보기
              </Text>
              <Text strong style={{ fontSize: 14 }}>
                {cronPreview}
              </Text>
            </Space>
          </div>
        )}

        {/* 설명 */}
        <Form.Item name="description" label="설명">
          <TextArea rows={2} placeholder="스케줄 설명 (선택)" maxLength={500} />
        </Form.Item>

        {/* 사용여부 */}
        <Form.Item name="useYn" label="사용여부" valuePropName="checked">
          <Switch checkedChildren="ON" unCheckedChildren="OFF" />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default BatchScheduleModal;
