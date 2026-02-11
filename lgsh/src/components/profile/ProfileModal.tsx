/**
 * 내 정보 모달 컴포넌트
 * - 헤더 "내 정보" 메뉴에서 사용
 * - 기본 정보 수정 + 비밀번호 변경
 */
import React, { useState, useEffect } from 'react';
import {
  Modal,
  Form,
  Input,
  Row,
  Col,
  Divider,
  Checkbox,
  Descriptions,
  message,
  Spin,
} from 'antd';
import { userService } from '@/services/userService';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { setUser } from '@/store/slices/authSlice';
import type { UserRequest } from '@/types';

interface ProfileModalProps {
  open: boolean;
  onClose: () => void;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ open, onClose }) => {
  const [form] = Form.useForm();
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector((state) => state.auth.user);

  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [changePwdChecked, setChangePwdChecked] = useState(false);
  const [userDetail, setUserDetail] = useState<any>(null);

  // 모달 열릴 때 사용자 상세 정보 조회
  useEffect(() => {
    if (open && currentUser?.userId) {
      fetchUserDetail();
    }
  }, [open, currentUser?.userId]);

  const fetchUserDetail = async () => {
    if (!currentUser?.userId) return;
    setDetailLoading(true);
    try {
      const response = await userService.get(currentUser.userId);
      if (response.success && response.data) {
        setUserDetail(response.data);
        form.setFieldsValue({
          userNm: response.data.userNm,
          email: response.data.email,
          telNo: response.data.telNo,
        });
      }
    } catch (error) {
      console.error('사용자 정보 조회 오류:', error);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleClose = () => {
    form.resetFields();
    setChangePwdChecked(false);
    setUserDetail(null);
    onClose();
  };

  const handleSubmit = async () => {
    if (!currentUser?.userId) return;

    try {
      const values = await form.validateFields();
      setLoading(true);

      // 기본 정보 수정
      const requestData: UserRequest = {
        userId: currentUser.userId,
        userNm: values.userNm,
        companyId: currentUser.companyId,
        roleId: currentUser.roleId,
        email: values.email,
        telNo: values.telNo,
      };

      const response = await userService.update(currentUser.userId, requestData);

      if (response?.success) {
        // Redux 사용자 정보 업데이트
        dispatch(setUser({
          ...currentUser,
          userNm: values.userNm,
          email: values.email,
        }));

        // localStorage도 업데이트
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          try {
            const parsed = JSON.parse(storedUser);
            parsed.userNm = values.userNm;
            parsed.email = values.email;
            localStorage.setItem('user', JSON.stringify(parsed));
          } catch { /* ignore */ }
        }

        // 비밀번호 변경
        if (changePwdChecked && values.newPassword) {
          const pwdResponse = await userService.changePassword(currentUser.userId, values.newPassword);
          if (pwdResponse?.success) {
            message.success('정보와 비밀번호가 변경되었습니다.');
          } else {
            message.warning('정보는 수정되었으나 비밀번호 변경에 실패했습니다.');
          }
        } else {
          message.success('정보가 수정되었습니다.');
        }

        handleClose();
      } else {
        message.error(response?.message || '저장에 실패했습니다.');
      }
    } catch (error: any) {
      console.error('저장 오류:', error);
      if (error?.errorFields) {
        message.error('입력값을 확인해주세요.');
      } else {
        const errorMessage = error?.response?.data?.message || error?.message || '저장 중 오류가 발생했습니다.';
        message.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="내 정보"
      open={open}
      onOk={handleSubmit}
      onCancel={handleClose}
      confirmLoading={loading}
      width={600}
      okText="저장"
      cancelText="취소"
      destroyOnClose
    >
      <Spin spinning={detailLoading}>
        {/* 읽기 전용 정보 */}
        <Descriptions
          column={2}
          size="small"
          bordered
          style={{ marginBottom: 16, marginTop: 16 }}
        >
          <Descriptions.Item label="사용자ID">{currentUser?.userId}</Descriptions.Item>
          <Descriptions.Item label="원청사">{currentUser?.companyNm}</Descriptions.Item>
          <Descriptions.Item label="역할">{currentUser?.roleNm}</Descriptions.Item>
          <Descriptions.Item label="최종로그인">
            {userDetail?.lastLoginDt || '-'}
          </Descriptions.Item>
        </Descriptions>

        {/* 수정 가능 폼 */}
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="사용자명"
                name="userNm"
                rules={[
                  { required: true, message: '사용자명을 입력하세요.' },
                  { max: 100, message: '최대 100자까지 입력 가능합니다.' },
                ]}
              >
                <Input placeholder="사용자명" maxLength={100} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="이메일"
                name="email"
                rules={[
                  { type: 'email', message: '올바른 이메일 형식이 아닙니다.' },
                  { max: 100, message: '최대 100자까지 입력 가능합니다.' },
                ]}
              >
                <Input placeholder="email@example.com" maxLength={100} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="전화번호"
                name="telNo"
                rules={[{ max: 20, message: '최대 20자까지 입력 가능합니다.' }]}
              >
                <Input placeholder="010-0000-0000" maxLength={20} />
              </Form.Item>
            </Col>
          </Row>

          {/* 비밀번호 변경 */}
          <Divider style={{ margin: '8px 0' }} />
          <Checkbox
            checked={changePwdChecked}
            onChange={(e) => {
              setChangePwdChecked(e.target.checked);
              if (!e.target.checked) {
                form.setFieldsValue({ newPassword: undefined, newPasswordConfirm: undefined });
              }
            }}
          >
            비밀번호 변경
          </Checkbox>
          {changePwdChecked && (
            <Row gutter={16} style={{ marginTop: 12 }}>
              <Col span={12}>
                <Form.Item
                  label="새 비밀번호"
                  name="newPassword"
                  rules={[
                    { required: true, message: '새 비밀번호를 입력하세요.' },
                    { min: 8, max: 20, message: '8~20자 사이로 입력하세요.' },
                    {
                      pattern: /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,20}$/,
                      message: '영문, 숫자, 특수문자를 각각 1개 이상 포함해야 합니다.',
                    },
                  ]}
                  extra="영문, 숫자, 특수문자(@$!%*#?&) 각 1개 이상 포함, 8~20자"
                >
                  <Input.Password placeholder="새 비밀번호" maxLength={20} autoComplete="new-password" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="새 비밀번호 확인"
                  name="newPasswordConfirm"
                  dependencies={['newPassword']}
                  rules={[
                    { required: true, message: '비밀번호 확인을 입력하세요.' },
                    ({ getFieldValue }) => ({
                      validator(_, value) {
                        if (!value || getFieldValue('newPassword') === value) {
                          return Promise.resolve();
                        }
                        return Promise.reject(new Error('비밀번호가 일치하지 않습니다.'));
                      },
                    }),
                  ]}
                >
                  <Input.Password placeholder="비밀번호 확인" maxLength={20} autoComplete="new-password" />
                </Form.Item>
              </Col>
            </Row>
          )}
        </Form>
      </Spin>
    </Modal>
  );
};

export default ProfileModal;
