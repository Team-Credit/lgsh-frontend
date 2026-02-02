/**
 * 컴포넌트 데모 페이지
 * - 공용 컴포넌트 사용 예시
 * - 메시지 코드 기반 메시지 출력
 */

import React, { useState } from 'react';
import { Card, Divider, Space, Row, Col, Input, Form, Select } from 'antd';
import { Settings } from 'lucide-react';
import {
  ActionButton,
  CreateButton,
  SaveButton,
  EditButton,
  DeleteButton,
  SearchButton,
  ResetButton,
  ApproveButton,
  RejectButton,
  CancelButton,
  ExportButton,
  ImportButton,
  RefreshButton,
  PrintButton,
  CopyButton,
  CloseButton,
  Modal,
  FormModal,
  ConfirmModal,
  DeleteConfirmModal,
  AlertModal,
} from '@/components/common';
import { useMessage } from '@/contexts';
import { MSG } from '@/types/message';

const ComponentDemoPage: React.FC = () => {
  // 메시지 훅
  const { showSuccess, showError, showWarning, showInfo, showConfirm, getText } = useMessage();

  // 모달 상태
  const [basicModalOpen, setBasicModalOpen] = useState(false);
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [alertModalOpen, setAlertModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // 버튼 클릭 핸들러 - 메시지 코드로 출력
  const handleCreate = () => showInfo(MSG.INFO.PROCESSING);
  const handleSave = () => showSuccess(MSG.SUCCESS.SAVE);
  const handleEdit = () => showInfo(MSG.INFO.PROCESSING);
  const handleDelete = () => showConfirm(MSG.CONFIRM.DELETE, () => showSuccess(MSG.SUCCESS.DELETE));
  const handleSearch = () => showInfo(MSG.INFO.NO_RESULT);
  const handleReset = () => showSuccess(MSG.SUCCESS.RESET);
  const handleApprove = () => showSuccess(MSG.SUCCESS.APPROVE);
  const handleReject = () => showSuccess(MSG.SUCCESS.REJECT);
  const handleCancel = () => showWarning(MSG.WARN.NO_CHANGE);
  const handleExport = () => showSuccess(MSG.SUCCESS.DOWNLOAD);
  const handleImport = () => showInfo(MSG.INFO.UPLOADING);
  const handleRefresh = () => showInfo(MSG.INFO.LOADING);
  const handlePrint = () => showInfo(MSG.INFO.PROCESSING);
  const handleCopy = () => showSuccess(MSG.SUCCESS.COPY);

  // 저장 시뮬레이션
  const handleFormSave = async () => {
    setLoading(true);
    showInfo(MSG.INFO.SAVING);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setLoading(false);
    setFormModalOpen(false);
    showSuccess(MSG.SUCCESS.SAVE);
  };

  // 삭제 시뮬레이션
  const handleDeleteConfirm = async () => {
    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setLoading(false);
    setDeleteModalOpen(false);
    showSuccess(MSG.SUCCESS.DELETE);
  };

  return (
    <div className="page">
      {/* 페이지 헤더 */}
      <div className="page-header">
        <h1 className="page-title">
          <span className="page-title-icon">
            <Settings size={20} />
          </span>
          컴포넌트 데모
        </h1>
      </div>

      <Row gutter={[16, 16]}>
        {/* 액션 버튼 */}
        <Col xs={24}>
          <Card title="액션 버튼 (메시지 코드 연동)" className="demo-card">
            <h4>기본 버튼</h4>
            <Space wrap className="mb-4">
              <CreateButton onClick={handleCreate} />
              <SaveButton onClick={handleSave} />
              <EditButton onClick={handleEdit} />
              <DeleteButton onClick={handleDelete} />
              <SearchButton onClick={handleSearch} />
              <ResetButton onClick={handleReset} />
            </Space>

            <Divider />

            <h4>승인/반려 버튼</h4>
            <Space wrap className="mb-4">
              <ApproveButton onClick={handleApprove} />
              <RejectButton onClick={handleReject} />
              <CancelButton onClick={handleCancel} />
            </Space>

            <Divider />

            <h4>기타 버튼</h4>
            <Space wrap className="mb-4">
              <ExportButton onClick={handleExport} />
              <ImportButton onClick={handleImport} />
              <RefreshButton onClick={handleRefresh} />
              <PrintButton onClick={handlePrint} />
              <CopyButton onClick={handleCopy} />
              <CloseButton onClick={() => showWarning(MSG.WARN.NO_SELECTION)} />
            </Space>

            <Divider />

            <h4>버튼 크기</h4>
            <Space wrap className="mb-4">
              <CreateButton size="small" label="Small" onClick={handleCreate} />
              <CreateButton size="middle" label="Middle" onClick={handleCreate} />
              <CreateButton size="large" label="Large" onClick={handleCreate} />
            </Space>

            <Divider />

            <h4>아이콘만 표시</h4>
            <Space wrap className="mb-4">
              <CreateButton hideLabel tooltip="등록" onClick={handleCreate} />
              <EditButton hideLabel tooltip="수정" onClick={handleEdit} />
              <DeleteButton hideLabel tooltip="삭제" onClick={handleDelete} />
              <RefreshButton hideLabel tooltip="새로고침" onClick={handleRefresh} />
            </Space>

            <Divider />

            <h4>비활성화 & 로딩</h4>
            <Space wrap className="mb-4">
              <SaveButton disabled />
              <SaveButton loading />
            </Space>
          </Card>
        </Col>

        {/* 메시지 코드 데모 */}
        <Col xs={24}>
          <Card title="메시지 코드 데모" className="demo-card">
            <h4>메시지 타입별 출력</h4>
            <Space wrap className="mb-4">
              <ActionButton
                actionType="save"
                label="성공 메시지"
                onClick={() => showSuccess(MSG.SUCCESS.COMPLETE)}
              />
              <ActionButton
                actionType="close"
                label="에러 메시지"
                onClick={() => showError(MSG.ERROR.SAVE_FAIL)}
              />
              <ActionButton
                actionType="reset"
                label="경고 메시지"
                onClick={() => showWarning(MSG.WARN.REQUIRED)}
              />
              <ActionButton
                actionType="search"
                label="정보 메시지"
                onClick={() => showInfo(MSG.INFO.NO_DATA)}
              />
            </Space>

            <Divider />

            <h4>확인 모달 (메시지 코드)</h4>
            <Space wrap>
              <ActionButton
                actionType="delete"
                label="삭제 확인"
                onClick={() => showConfirm(
                  MSG.CONFIRM.DELETE,
                  () => showSuccess(MSG.SUCCESS.DELETE)
                )}
              />
              <ActionButton
                actionType="approve"
                label="승인 확인"
                onClick={() => showConfirm(
                  MSG.CONFIRM.APPROVE,
                  () => showSuccess(MSG.SUCCESS.APPROVE)
                )}
              />
              <ActionButton
                actionType="cancel"
                label="취소 확인"
                onClick={() => showConfirm(
                  MSG.CONFIRM.CANCEL,
                  () => showWarning(MSG.WARN.NO_CHANGE)
                )}
              />
            </Space>
          </Card>
        </Col>

        {/* 모달 */}
        <Col xs={24}>
          <Card title="모달" className="demo-card">
            <h4>모달 유형</h4>
            <Space wrap>
              <ActionButton
                actionType="search"
                label="기본 모달"
                onClick={() => setBasicModalOpen(true)}
              />
              <ActionButton
                actionType="create"
                label="폼 모달"
                onClick={() => setFormModalOpen(true)}
              />
              <ActionButton
                actionType="approve"
                label="확인 모달"
                onClick={() => setConfirmModalOpen(true)}
              />
              <ActionButton
                actionType="delete"
                label="삭제 확인"
                onClick={() => setDeleteModalOpen(true)}
              />
              <ActionButton
                actionType="save"
                label="알림 모달"
                onClick={() => setAlertModalOpen(true)}
              />
            </Space>
          </Card>
        </Col>

        {/* 뱃지/태그 */}
        <Col xs={24} lg={12}>
          <Card title="뱃지 & 태그" className="demo-card">
            <h4>상태 뱃지</h4>
            <Space wrap className="mb-4">
              <span className="badge badge-primary">Primary</span>
              <span className="badge badge-success">Success</span>
              <span className="badge badge-warning">Warning</span>
              <span className="badge badge-error">Error</span>
              <span className="badge badge-info">Info</span>
              <span className="badge badge-gray">Gray</span>
            </Space>

            <Divider />

            <h4>역할 뱃지</h4>
            <Space wrap>
              <span className="role-badge role-badge-admin">ADMIN</span>
              <span className="role-badge role-badge-manager">MANAGER</span>
              <span className="role-badge role-badge-user">USER</span>
              <span className="role-badge role-badge-analyst">ANALYST</span>
            </Space>
          </Card>
        </Col>

        {/* 폼 레이아웃 */}
        <Col xs={24} lg={12}>
          <Card title="폼 버튼 영역" className="demo-card">
            <Form layout="vertical">
              <Form.Item label="이름">
                <Input placeholder="이름을 입력하세요" />
              </Form.Item>
              <Form.Item label="역할">
                <Select placeholder="역할 선택">
                  <Select.Option value="admin">관리자</Select.Option>
                  <Select.Option value="user">사용자</Select.Option>
                </Select>
              </Form.Item>
            </Form>
            
            <div className="form-actions">
              <CancelButton onClick={() => showConfirm(MSG.CONFIRM.CANCEL, () => {})} />
              <SaveButton onClick={() => showConfirm(MSG.CONFIRM.SAVE, handleSave)} />
            </div>
          </Card>
        </Col>

        {/* 툴바 */}
        <Col xs={24}>
          <Card title="툴바 레이아웃" className="demo-card">
            <div className="toolbar">
              <div className="toolbar-left">
                <SearchButton onClick={handleSearch} />
                <ResetButton onClick={handleReset} />
              </div>
              <div className="toolbar-right">
                <ExportButton onClick={handleExport} />
                <CreateButton onClick={handleCreate} />
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* 기본 모달 */}
      <Modal
        open={basicModalOpen}
        title="기본 모달"
        onOk={() => {
          setBasicModalOpen(false);
          showSuccess(MSG.SUCCESS.COMPLETE);
        }}
        onCancel={() => setBasicModalOpen(false)}
      >
        <p>기본 모달 내용입니다.</p>
        <p>확인/취소 버튼이 있는 일반적인 모달입니다.</p>
      </Modal>

      {/* 폼 모달 */}
      <FormModal
        open={formModalOpen}
        title="사용자 등록"
        onSubmit={handleFormSave}
        onCancel={() => setFormModalOpen(false)}
        confirmLoading={loading}
        width={500}
      >
        <Form layout="vertical">
          <Form.Item label="이름" required>
            <Input placeholder="이름을 입력하세요" />
          </Form.Item>
          <Form.Item label="이메일" required>
            <Input placeholder="이메일을 입력하세요" />
          </Form.Item>
          <Form.Item label="역할">
            <Select placeholder="역할 선택">
              <Select.Option value="admin">관리자</Select.Option>
              <Select.Option value="manager">매니저</Select.Option>
              <Select.Option value="user">사용자</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </FormModal>

      {/* 확인 모달 */}
      <ConfirmModal
        open={confirmModalOpen}
        title="승인 확인"
        message={getText(MSG.CONFIRM.APPROVE)}
        iconType="warning"
        okText="승인"
        onOk={() => {
          setConfirmModalOpen(false);
          showSuccess(MSG.SUCCESS.APPROVE);
        }}
        onCancel={() => setConfirmModalOpen(false)}
      />

      {/* 삭제 확인 모달 */}
      <DeleteConfirmModal
        open={deleteModalOpen}
        targetName="홍길동"
        onOk={handleDeleteConfirm}
        onCancel={() => setDeleteModalOpen(false)}
        confirmLoading={loading}
      />

      {/* 알림 모달 */}
      <AlertModal
        open={alertModalOpen}
        alertType="success"
        message={getText(MSG.SUCCESS.COMPLETE)}
        onOk={() => setAlertModalOpen(false)}
        onCancel={() => setAlertModalOpen(false)}
      />
    </div>
  );
};

export default ComponentDemoPage;
