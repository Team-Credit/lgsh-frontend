/**
 * 공지사항 상세 페이지
 */
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Descriptions, Button, Space, Tag, Modal, message } from 'antd';
import { marked } from 'marked';
import { noticeService } from '@/services/noticeService';
import { Notice } from '@/types';
import './NoticeDetail.css';

const looksLikeHtml = (value: string) => /<\/?[a-z][\s\S]*>/i.test(value);

const toHtml = (raw: string) => {
    if (!raw) return '';
    return looksLikeHtml(raw) ? raw : String(marked.parse(raw));
};

const NoticeDetail: React.FC = () => {
    const { noticeId } = useParams<{ noticeId: string }>();
    const navigate = useNavigate();

    // 상태 관리 (리액트 useState)
    const [loading, setLoading] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [data, setData] = useState<Notice | null>(null);
    const [error, setError] = useState<any>(null);

    const contentHtml = useMemo(() => toHtml(data?.content || ''), [data?.content]);

    // 데이터 조회 (리액트 useEffect: 컴포넌트 마운트 시)
    const fetchDetail = useCallback(async () => {
        if (!noticeId) return;

        setLoading(true);
        try {
            const response = await noticeService.get(Number(noticeId));
            if (response.success && response.data) {
                setData(response.data);
            } else {
                message.error(response.message || '공지사항 상세 정보를 불러오는 데 실패했습니다.');
            }
        } catch (err) {
            setError(err);
            console.error('공지사항 상세 조회 오류:', err);
            message.error('공지사항 상세 정보를 불러오는 데 실패했습니다.');
        } finally {
            setLoading(false);
        }
    }, [noticeId]);

    // 초기 로드
    useEffect(() => {
        fetchDetail();
    }, [fetchDetail]);

    // 삭제 처리
    const handleDelete = () => {
        Modal.confirm({
            title: '공지사항 삭제',
            content: '정말로 삭제하시겠습니까?',
            okText: '삭제',
            okType: 'danger',
            cancelText: '취소',
            onOk: async () => {
                if (!noticeId) return;

                setDeleting(true);
                try {
                    const response = await noticeService.delete(Number(noticeId));
                    if (response.success) {
                        message.success('공지사항이 삭제되었습니다.');
                        navigate('/notices');
                    } else {
                        message.error(response.message || '공지사항 삭제에 실패했습니다.');
                    }
                } catch (error: any) {
                    console.error('공지사항 삭제 오류:', error);
                    const errorMessage = error?.response?.data?.message || error?.message || '공지사항 삭제 중 오류가 발생했습니다.';
                    message.error(errorMessage);
                } finally {
                    setDeleting(false);
                }
            }
        });
    };

    if (loading) return <div>Loading...</div>;
    if (error) return <div>Error loading notice detail</div>;
    if (!data) return <div>Notice not found</div>;

    return (
        <div className="notice-detail">
            <Card
                title="공지사항 상세"
                extra={
                    <Space>
                        <Button onClick={() => navigate('/notices')}>목록</Button>
                        <Button type="primary" onClick={() => navigate(`/admin/notices/edit/${noticeId}`)}>수정 (Admin)</Button>
                        <Button danger onClick={handleDelete} loading={deleting}>삭제 (Admin)</Button>
                    </Space>
                }
            >
                <Descriptions bordered column={2} labelStyle={{ width: '150px' }}>
                    <Descriptions.Item label="제목" span={2}>
                        {data.pinYn === 'Y' && <Tag color="gold">상단고정</Tag>}
                        {data.lvl === '3' && <Tag color="red">긴급</Tag>}
                        {data.lvl === '2' && <Tag color="orange">중요</Tag>}
                        {data.title}
                    </Descriptions.Item>
                    <Descriptions.Item label="작성자">{data.regUserId}</Descriptions.Item>
                    <Descriptions.Item label="조회수">{data.viewCnt?.toLocaleString()}</Descriptions.Item>
                    <Descriptions.Item label="게시기간">
                        {data.startDt} ~ {data.endDt}
                    </Descriptions.Item>
                    <Descriptions.Item label="등록일">{data.regDt}</Descriptions.Item>
                </Descriptions>

                <div className="notice-detail__content-area">
                    <div
                        className="notice-detail__content"
                        dangerouslySetInnerHTML={{ __html: contentHtml }}
                    />
                </div>
            </Card>
        </div>
    );
};

export default NoticeDetail;