/**
 * 공지사항 등록/수정 페이지
 * NOT002 - 공지사항 등록 기능
 */
import React, { useEffect, useState, useCallback } from 'react';
import { Form, Input, Button, DatePicker, Switch, Space, Card, Row, Col, Select, message } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { marked } from 'marked';
import TurndownService from 'turndown';
import dayjs from 'dayjs';
import { noticeService } from '@/services/noticeService';
import { Notice } from '@/types';
import './NoticeFormPage.css';

const turndownService = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
});

const looksLikeHtml = (value: string) => /<\/?[a-z][\s\S]*>/i.test(value);

const toHtml = (raw: string) => {
    if (!raw) return '';
    return looksLikeHtml(raw) ? raw : String(marked.parse(raw));
};

const NoticeFormPage: React.FC = () => {
    const navigate = useNavigate();
    const { noticeId } = useParams<{ noticeId: string }>();
    const isEdit = !!noticeId;

    const [form] = Form.useForm();
    const editor = useEditor({
        extensions: [StarterKit],
        content: '',
        editorProps: {
            attributes: {
                class: 'notice-editor__content',
            },
        },
    });

    // 로딩 상태 관리(조회/저장)
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [detailData, setDetailData] = useState<Notice | null>(null);

    // 상세 조회 (수정 모드에서만 실행)
    const fetchDetail = useCallback(async () => {
        if (!noticeId) return;

        setLoading(true);
        try {
            const response = await noticeService.get(Number(noticeId));
            if (response.success && response.data) {
                setDetailData(response.data);
            } else {
                message.error(response.message || '공지사항 상세 정보를 불러오지 못했습니다.');
            }
        } catch (error: any) {
            console.error('공지사항 상세 조회 오류:', error);
            message.error('공지사항 상세 정보를 불러오지 못했습니다.');
        } finally {
            setLoading(false);
        }
    }, [noticeId]);

    // 컴포넌트 마운트 시 상세 데이터 조회
    useEffect(() => {
        if (isEdit) {
            fetchDetail();
        }
    }, [isEdit, fetchDetail]);

    // 상세 데이터 수신 시 폼/에디터 값 반영
    useEffect(() => {
        if (detailData) {
            form.setFieldsValue({
                title: detailData.title,
                lvl: detailData.lvl,
                pinYn: detailData.pinYn === 'Y',
                useYn: detailData.useYn === 'Y',
                period: [
                    detailData.startDt ? dayjs(detailData.startDt) : null,
                    detailData.endDt ? dayjs(detailData.endDt) : null,
                ]
            });

            if (editor) {
                editor.commands.setContent(toHtml(detailData.content || ''), false);
            }
        }
    }, [detailData, form, editor]);

    const onFinish = async (values: any) => {
        const html = editor?.getHTML() || '';
        const content = html ? turndownService.turndown(html) : '';

        const payload = {
            title: values.title,
            content: content,
            lvl: values.lvl,
            pinYn: values.pinYn ? 'Y' : 'N',
            useYn: values.useYn ? 'Y' : 'N',
            startDt: values.period && values.period[0] ? values.period[0].format('YYYYMMDD') : '',
            endDt: values.period && values.period[1] ? values.period[1].format('YYYYMMDD') : '',
        };

        setSubmitting(true);
        try {
            let response;
            if (isEdit && noticeId) {
                response = await noticeService.update(Number(noticeId), payload);
            } else {
                response = await noticeService.create(payload);
            }

            if (response.success) {
                message.success(isEdit ? '공지사항이 수정되었습니다.' : '공지사항이 등록되었습니다.');
                navigate('/notices');
            } else {
                message.error(response.message || '요청 처리에 실패했습니다.');
            }
        } catch (error: any) {
            console.error('저장 오류:', error);
            const errorMessage = error?.response?.data?.message || error?.message || '알 수 없는 오류가 발생했습니다.';
            message.error(errorMessage);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div>Loading...</div>;

    return (
        <div className="notice-form-page">
            <Card title={isEdit ? "공지사항 수정" : "공지사항 등록"} bordered={false}>
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={onFinish}
                    initialValues={{
                        lvl: '1',
                        pinYn: false,
                        useYn: true
                    }}
                >
                    <Row gutter={16}>
                        <Col span={16}>
                            <Form.Item name="title" label="제목" rules={[{ required: true, message: '제목을 입력해 주세요.' }]}>
                                <Input placeholder="제목 입력" />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item name="lvl" label="중요도" rules={[{ required: true }]}>
                                <Select>
                                    <Select.Option value="1">일반</Select.Option>
                                    <Select.Option value="2">중요</Select.Option>
                                    <Select.Option value="3">긴급</Select.Option>
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="period" label="게시 기간">
                                <DatePicker.RangePicker style={{ width: '100%' }} />
                            </Form.Item>
                        </Col>
                        <Col span={6}>
                            <Form.Item name="pinYn" label="상단 고정" valuePropName="checked">
                                <Switch checkedChildren="고정" unCheckedChildren="해제" />
                            </Form.Item>
                        </Col>
                        <Col span={6}>
                            <Form.Item name="useYn" label="사용 여부" valuePropName="checked">
                                <Switch checkedChildren="사용" unCheckedChildren="미사용" />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Form.Item label="내용" required>
                        <div className="notice-editor">
                        <div className="notice-editor__toolbar">
                            <Space wrap>
                                <Button size="small" type={editor?.isActive('bold') ? 'primary' : 'default'} disabled={!editor} onClick={() => editor?.chain().focus().toggleBold().run()}>굵게</Button>
                                <Button size="small" type={editor?.isActive('italic') ? 'primary' : 'default'} disabled={!editor} onClick={() => editor?.chain().focus().toggleItalic().run()}>기울임</Button>
                                <Button size="small" type={editor?.isActive('strike') ? 'primary' : 'default'} disabled={!editor} onClick={() => editor?.chain().focus().toggleStrike().run()}>취소선</Button>
                                <Button size="small" type={editor?.isActive('heading', { level: 2 }) ? 'primary' : 'default'} disabled={!editor} onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}>제목</Button>
                                <Button size="small" type={editor?.isActive('bulletList') ? 'primary' : 'default'} disabled={!editor} onClick={() => editor?.chain().focus().toggleBulletList().run()}>글머리</Button>
                                <Button size="small" type={editor?.isActive('orderedList') ? 'primary' : 'default'} disabled={!editor} onClick={() => editor?.chain().focus().toggleOrderedList().run()}>번호</Button>
                                <Button size="small" type={editor?.isActive('blockquote') ? 'primary' : 'default'} disabled={!editor} onClick={() => editor?.chain().focus().toggleBlockquote().run()}>인용</Button>
                                <Button size="small" type={editor?.isActive('codeBlock') ? 'primary' : 'default'} disabled={!editor} onClick={() => editor?.chain().focus().toggleCodeBlock().run()}>코드</Button>
                                <Button size="small" disabled={!editor} onClick={() => editor?.chain().focus().undo().run()}>실행취소</Button>
                                <Button size="small" disabled={!editor} onClick={() => editor?.chain().focus().redo().run()}>다시</Button>
                            </Space>
                        </div>
                        <EditorContent editor={editor} />
                    </div>
                    </Form.Item>

                    <div className="notice-form-page__footer">
                        <Space>
                            <Button onClick={() => navigate('/notices')}>취소</Button>
                            <Button type="primary" htmlType="submit" loading={submitting}>
                                {isEdit ? '수정' : '등록'}
                            </Button>
                        </Space>
                    </div>
                </Form>
            </Card>
        </div>
    );
};

export default NoticeFormPage;
