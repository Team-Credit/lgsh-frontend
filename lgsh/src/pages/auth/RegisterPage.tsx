/**
 * 회원가입 페이지
 * - 관리자 승인 필요
 * - 원청사, 희망역할 선택
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Spin, message } from 'antd';
import axios from 'axios';
import type { Company, MinorCode, ApiResponse } from '@/types';
import './RegisterPage.css';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

interface RegisterFormData {
  userId: string;
  userNm: string;
  userPwd: string;
  userPwdConfirm: string;
  email: string;
  telNo: string;
  companyId: string;
  roleId: string;
}

interface FormErrors {
  userId?: string;
  userNm?: string;
  userPwd?: string;
  userPwdConfirm?: string;
  email?: string;
  telNo?: string;
  companyId?: string;
  roleId?: string;
}

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();

  // 폼 상태
  const [formData, setFormData] = useState<RegisterFormData>({
    userId: '',
    userNm: '',
    userPwd: '',
    userPwdConfirm: '',
    email: '',
    telNo: '',
    companyId: '',
    roleId: '',
  });
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // 원청사, 역할 목록
  const [companies, setCompanies] = useState<Company[]>([]);
  const [roles, setRoles] = useState<MinorCode[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  // 원청사, 역할 목록 조회 (인증 없이 공개 API 호출)
  useEffect(() => {
    const fetchData = async () => {
      try {
        setDataLoading(true);
        const [companyRes, roleRes] = await Promise.all([
          axios.get<ApiResponse<Company[]>>(`${BASE_URL}/public/companies`),
          axios.get<ApiResponse<MinorCode[]>>(`${BASE_URL}/public/codes/USER_ROLE`),
        ]);

        if (companyRes.data.success && companyRes.data.data) {
          setCompanies(companyRes.data.data);
        }
        if (roleRes.data.success && roleRes.data.data) {
          // 공통코드에서 사용여부 Y인 것만 필터링
          const activeRoles = roleRes.data.data.filter((r: MinorCode) => r.useYn === 'Y');
          setRoles(activeRoles);
        }
      } catch (error) {
        console.error('데이터 조회 실패:', error);
        message.error('원청사/역할 목록을 불러오는데 실패했습니다.');
      } finally {
        setDataLoading(false);
      }
    };

    fetchData();
  }, []);

  // 입력값 변경 핸들러
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setFormErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  // 전화번호 포맷팅
  const handleTelNoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/[^0-9]/g, '');

    if (value.length > 3 && value.length <= 7) {
      value = value.slice(0, 3) + '-' + value.slice(3);
    } else if (value.length > 7) {
      value = value.slice(0, 3) + '-' + value.slice(3, 7) + '-' + value.slice(7, 11);
    }

    setFormData((prev) => ({ ...prev, telNo: value }));
    setFormErrors((prev) => ({ ...prev, telNo: undefined }));
  };

  // 폼 유효성 검사
  const validateForm = (): boolean => {
    const errors: FormErrors = {};

    // 아이디
    if (!formData.userId.trim()) {
      errors.userId = '아이디를 입력해주세요.';
    } else if (formData.userId.length < 4 || formData.userId.length > 50) {
      errors.userId = '아이디는 4~50자 사이로 입력해주세요.';
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.userId)) {
      errors.userId = '아이디는 영문, 숫자, 밑줄(_)만 사용 가능합니다.';
    }

    // 이름
    if (!formData.userNm.trim()) {
      errors.userNm = '이름을 입력해주세요.';
    } else if (formData.userNm.length < 2 || formData.userNm.length > 100) {
      errors.userNm = '이름은 2~100자 사이로 입력해주세요.';
    }

    // 비밀번호
    const pwdRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,20}$/;
    if (!formData.userPwd) {
      errors.userPwd = '비밀번호를 입력해주세요.';
    } else if (!pwdRegex.test(formData.userPwd)) {
      errors.userPwd = '영문, 숫자, 특수문자(@$!%*#?&)를 각각 1개 이상 포함, 8~20자';
    }

    // 비밀번호 확인
    if (!formData.userPwdConfirm) {
      errors.userPwdConfirm = '비밀번호 확인을 입력해주세요.';
    } else if (formData.userPwd !== formData.userPwdConfirm) {
      errors.userPwdConfirm = '비밀번호가 일치하지 않습니다.';
    }

    // 이메일
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      errors.email = '이메일을 입력해주세요.';
    } else if (!emailRegex.test(formData.email)) {
      errors.email = '올바른 이메일 형식이 아닙니다.';
    }

    // 전화번호 (선택)
    if (formData.telNo && !/^\d{2,3}-\d{3,4}-\d{4}$/.test(formData.telNo)) {
      errors.telNo = '올바른 전화번호 형식이 아닙니다. (예: 010-1234-5678)';
    }

    // 원청사
    if (!formData.companyId) {
      errors.companyId = '원청사를 선택해주세요.';
    }

    // 희망역할
    if (!formData.roleId) {
      errors.roleId = '희망역할을 선택해주세요.';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // 회원가입 제출 (인증 없이 공개 API 호출)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);

      const response = await axios.post<ApiResponse<null>>(`${BASE_URL}/public/register`, {
        userId: formData.userId,
        userNm: formData.userNm,
        userPwd: formData.userPwd,
        email: formData.email,
        telNo: formData.telNo || null,
        companyId: formData.companyId,
        roleId: formData.roleId,
        useYn: 'N', // 관리자 승인 전까지 비활성
      });

      if (response.data.success) {
        setSubmitSuccess(true);
      } else {
        message.error(response.data.message || '회원가입에 실패했습니다.');
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      message.error(err.response?.data?.message || '회원가입에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 가입 완료 화면
  if (submitSuccess) {
    return (
      <div className="register-page">
        <div className="register-container">
          <div className="register-card">
            <div className="register-header">
              <div className="register-logo-wrapper">
                <img src="/logo.png" alt="LGSH Logo" className="register-logo" />
              </div>
              <h1 className="register-title">회원가입 완료</h1>
            </div>
            <div className="register-body">
              <div className="register-success">
                <div className="success-icon">✓</div>
                <h2>가입 신청이 완료되었습니다</h2>
                <p>
                  관리자 승인 후 로그인이 가능합니다.
                  <br />
                  승인까지 영업일 기준 1~2일이 소요될 수 있습니다.
                </p>
                <button
                  type="button"
                  className="register-button"
                  onClick={() => navigate('/login')}
                >
                  로그인 페이지로 이동
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="register-page">
      <div className="register-container">
        <div className="register-card">
          {/* 헤더 */}
          <div className="register-header">
            <div className="register-logo-wrapper">
              <img src="/logo.png" alt="LGSH Logo" className="register-logo" />
            </div>
            <h1 className="register-title">회원가입</h1>
            <p className="register-subtitle">AI 신용평가 시스템</p>
          </div>

          {/* 바디 */}
          <div className="register-body">
            {dataLoading ? (
              <div className="register-loading">
                <Spin size="large" />
              </div>
            ) : (
              <form className="register-form" onSubmit={handleSubmit}>
                {/* 안내 문구 */}
                <div className="register-notice">
                  <p>※ 회원가입 후 관리자 승인이 필요합니다.</p>
                </div>

                {/* 아이디 */}
                <div className="form-group">
                  <label className="form-label">
                    아이디 <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    name="userId"
                    className={`form-input ${formErrors.userId ? 'error' : ''}`}
                    placeholder="영문, 숫자, 밑줄 4~50자"
                    value={formData.userId}
                    onChange={handleChange}
                    disabled={loading}
                    maxLength={50}
                    autoComplete="off"
                  />
                  {formErrors.userId && (
                    <span className="form-error">{formErrors.userId}</span>
                  )}
                </div>

                {/* 이름 */}
                <div className="form-group">
                  <label className="form-label">
                    이름 <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    name="userNm"
                    className={`form-input ${formErrors.userNm ? 'error' : ''}`}
                    placeholder="이름을 입력하세요"
                    value={formData.userNm}
                    onChange={handleChange}
                    disabled={loading}
                    maxLength={100}
                    autoComplete="off"
                  />
                  {formErrors.userNm && (
                    <span className="form-error">{formErrors.userNm}</span>
                  )}
                </div>

                {/* 비밀번호 */}
                <div className="form-row">
                  <div className="form-group half">
                    <label className="form-label">
                      비밀번호 <span className="required">*</span>
                    </label>
                    <input
                      type="password"
                      name="userPwd"
                      className={`form-input ${formErrors.userPwd ? 'error' : ''}`}
                      placeholder="8~20자"
                      value={formData.userPwd}
                      onChange={handleChange}
                      disabled={loading}
                      maxLength={20}
                      autoComplete="new-password"
                    />
                    {formErrors.userPwd && (
                      <span className="form-error">{formErrors.userPwd}</span>
                    )}
                  </div>
                  <div className="form-group half">
                    <label className="form-label">
                      비밀번호 확인 <span className="required">*</span>
                    </label>
                    <input
                      type="password"
                      name="userPwdConfirm"
                      className={`form-input ${formErrors.userPwdConfirm ? 'error' : ''}`}
                      placeholder="비밀번호 확인"
                      value={formData.userPwdConfirm}
                      onChange={handleChange}
                      disabled={loading}
                      maxLength={20}
                      autoComplete="new-password"
                    />
                    {formErrors.userPwdConfirm && (
                      <span className="form-error">{formErrors.userPwdConfirm}</span>
                    )}
                  </div>
                </div>
                <div className="form-hint">
                  영문, 숫자, 특수문자(@$!%*#?&) 각 1개 이상 포함
                </div>

                {/* 이메일 */}
                <div className="form-group">
                  <label className="form-label">
                    이메일 <span className="required">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    className={`form-input ${formErrors.email ? 'error' : ''}`}
                    placeholder="example@email.com"
                    value={formData.email}
                    onChange={handleChange}
                    disabled={loading}
                    autoComplete="email"
                  />
                  {formErrors.email && (
                    <span className="form-error">{formErrors.email}</span>
                  )}
                </div>

                {/* 전화번호 */}
                <div className="form-group">
                  <label className="form-label">전화번호</label>
                  <input
                    type="tel"
                    name="telNo"
                    className={`form-input ${formErrors.telNo ? 'error' : ''}`}
                    placeholder="010-1234-5678"
                    value={formData.telNo}
                    onChange={handleTelNoChange}
                    disabled={loading}
                    maxLength={13}
                    autoComplete="tel"
                  />
                  {formErrors.telNo && (
                    <span className="form-error">{formErrors.telNo}</span>
                  )}
                </div>

                {/* 원청사 */}
                <div className="form-group">
                  <label className="form-label">
                    원청사 <span className="required">*</span>
                  </label>
                  <select
                    name="companyId"
                    className={`form-input form-select ${formErrors.companyId ? 'error' : ''}`}
                    value={formData.companyId}
                    onChange={handleChange}
                    disabled={loading}
                  >
                    <option value="">원청사를 선택하세요</option>
                    {companies.map((company) => (
                      <option key={company.companyId} value={company.companyId}>
                        {company.companyNm}
                      </option>
                    ))}
                  </select>
                  {formErrors.companyId && (
                    <span className="form-error">{formErrors.companyId}</span>
                  )}
                </div>

                {/* 희망역할 */}
                <div className="form-group">
                  <label className="form-label">
                    희망역할 <span className="required">*</span>
                  </label>
                  <select
                    name="roleId"
                    className={`form-input form-select ${formErrors.roleId ? 'error' : ''}`}
                    value={formData.roleId}
                    onChange={handleChange}
                    disabled={loading}
                  >
                    <option value="">희망역할을 선택하세요</option>
                    {roles.map((role) => (
                      <option key={role.minorCode} value={role.minorCode}>
                        {role.minorCodeNm}
                      </option>
                    ))}
                  </select>
                  {formErrors.roleId && (
                    <span className="form-error">{formErrors.roleId}</span>
                  )}
                  <div className="form-hint">
                    ※ 희망역할은 관리자 승인 시 변경될 수 있습니다.
                  </div>
                </div>

                {/* 가입 버튼 */}
                <button
                  type="submit"
                  className="register-button"
                  disabled={loading}
                >
                  {loading ? <Spin size="small" /> : '가입 신청'}
                </button>

                {/* 로그인 링크 */}
                <div className="login-link">
                  이미 계정이 있으신가요?{' '}
                  <a
                    href="/login"
                    onClick={(e) => {
                      e.preventDefault();
                      navigate('/login');
                    }}
                  >
                    로그인
                  </a>
                </div>
              </form>
            )}
          </div>

          {/* 푸터 */}
          <div className="register-footer">
            <p className="register-footer-text">
              © 2026 LGSH. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
