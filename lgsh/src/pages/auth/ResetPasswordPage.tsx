import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { message, Spin } from 'antd';
import api from '@/services/api';
import './ResetPasswordPage.css';

const ResetPasswordPage: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');

    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!token) {
            message.error('유효하지 않은 접근입니다.');
            navigate('/login');
        }
    }, [token, navigate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (newPassword !== confirmPassword) {
            setError('비밀번호가 일치하지 않습니다.');
            return;
        }

        // 비밀번호 정규식 검사
        const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/;
        if (!passwordRegex.test(newPassword)) {
            setError('비밀번호는 8자 이상, 영문, 숫자, 특수문자를 포함해야 합니다.');
            return;
        }

        setLoading(true);
        try {
            await api.post('/auth/reset-password', {
                token: token,
                newPassword: newPassword
            });
            message.success('비밀번호가 성공적으로 변경되었습니다. 로그인 해 주세요.');
            navigate('/login');
        } catch (err: any) {
            console.error(err);
            const msg = err.response?.data?.message || '비밀번호 재설정에 실패했습니다.';
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="reset-password-page">
            <div className="reset-password-container">
                <div className="reset-password-card">
                    <div className="reset-password-header">
                        <img src="/logo.png" alt="LGSH Logo" className="reset-password-logo" />
                        <h2 className="reset-password-title">비밀번호 재설정</h2>
                        <p className="reset-password-subtitle">새로운 비밀번호를 입력해 주세요.</p>
                    </div>

                    <form className="reset-password-form" onSubmit={handleSubmit}>
                        {error && <div className="reset-password-error">{error}</div>}

                        <div className="form-group">
                            <label className="form-label">새 비밀번호</label>
                            <input
                                type="password"
                                className="form-input"
                                placeholder="8자 이상, 영문/숫자/특수문자 포함"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                disabled={loading}
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">비밀번호 확인</label>
                            <input
                                type="password"
                                className="form-input"
                                placeholder="비밀번호를 다시 입력하세요"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                disabled={loading}
                            />
                        </div>

                        <button type="submit" className="reset-password-button" disabled={loading}>
                            {loading ? <Spin size="small" /> : '비밀번호 변경'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ResetPasswordPage;
