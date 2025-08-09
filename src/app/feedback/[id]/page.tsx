'use client';

import { useEffect, useState } from 'react';
import { User, checkAuthStatus, getClientLoginUrl } from '@polyrhythm-inc/nextjs-auth-client';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface ScreenshotData {
  id: string;
  screenshotUrl: string;
  domTree: string;
  tabUrl: string;
  tabTitle: string;
  timestamp: number;
  pageInfo: any;
  createdAt: string;
  updatedAt: string;
}

interface FeedbackRecord {
  id: number;
  comment: string;
  screenshotDataId: string;
  timestamp: number;
  userAgent: string;
  createdAt: string;
  updatedAt: string;
  screenshotData: ScreenshotData;
}

export default function FeedbackDetail() {
  const params = useParams();
  const router = useRouter();
  const feedbackId = params.id as string;
  
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [feedback, setFeedback] = useState<FeedbackRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [taskCreationResult, setTaskCreationResult] = useState<{ success: boolean; message: string; taskUrl?: string } | null>(null);
  const [isEditingComment, setIsEditingComment] = useState(false);
  const [editedComment, setEditedComment] = useState('');
  const [isSavingComment, setIsSavingComment] = useState(false);

  // フィードバック詳細の取得
  const fetchFeedback = async () => {
    try {
      const response = await fetch(`/api/feedback/${feedbackId}`);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('フィードバックが見つかりません');
        }
        throw new Error(`フィードバック取得エラー: ${response.status}`);
      }

      const data = await response.json();

      if (data.success && data.feedback) {
        setFeedback(data.feedback);
      } else {
        throw new Error('フィードバックデータの形式が不正です');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '不明なエラー';
      setError(errorMessage);
      console.error('フィードバック取得エラー:', err);
    }
  };

  // タスク作成処理
  const handleCreateTask = async () => {
    if (!feedback) return;

    setIsCreatingTask(true);
    setTaskCreationResult(null);

    try {
      const response = await fetch(`/api/feedback/${feedback.id}/create-task`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.success) {
        setTaskCreationResult({
          success: true,
          message: 'タスクが正常に作成されました',
          taskUrl: data.taskUrl,
        });
      } else {
        setTaskCreationResult({
          success: false,
          message: data.error || 'タスクの作成に失敗しました',
        });
      }
    } catch (error) {
      setTaskCreationResult({
        success: false,
        message: 'タスク作成中にエラーが発生しました',
      });
      console.error('タスク作成エラー:', error);
    } finally {
      setIsCreatingTask(false);
    }
  };

  // コメント編集を開始
  const startEditingComment = () => {
    if (feedback) {
      setEditedComment(feedback.comment);
      setIsEditingComment(true);
    }
  };

  // コメント編集をキャンセル
  const cancelEditingComment = () => {
    setIsEditingComment(false);
    setEditedComment('');
  };

  // コメントを保存
  const saveComment = async () => {
    if (!feedback || isSavingComment) return;

    setIsSavingComment(true);
    try {
      const response = await fetch(`/api/feedback/${feedback.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ comment: editedComment }),
      });

      if (!response.ok) {
        throw new Error('コメントの更新に失敗しました');
      }

      // 更新成功後、フィードバックを再取得
      await fetchFeedback();

      setIsEditingComment(false);
      setEditedComment('');
    } catch (error) {
      console.error('コメント更新エラー:', error);
      alert('コメントの更新に失敗しました');
    } finally {
      setIsSavingComment(false);
    }
  };

  // 認証チェック
  useEffect(() => {
    const validateAuth = async () => {
      try {
        const userData = await checkAuthStatus();
        if (userData) {
          setUser(userData);
          // 認証成功後にデータを読み込み
          setLoading(true);
          await fetchFeedback();
          setLoading(false);
        } else {
          // 未認証の場合、ログイン画面にリダイレクト
          const loginUrl = getClientLoginUrl();
          window.location.href = loginUrl;
        }
      } catch (error) {
        console.error('認証チェックエラー:', error);
        // エラー時もログイン画面にリダイレクト
        const loginUrl = getClientLoginUrl();
        window.location.href = loginUrl;
      } finally {
        setAuthLoading(false);
      }
    };

    validateAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feedbackId]);

  const formatDate = (timestamp: string | number) => {
    // timestampは秒単位で保存されているので、ミリ秒に変換
    const timestampMs = (typeof timestamp === 'string' ? parseInt(timestamp) : timestamp) * 1000;
    const date = new Date(timestampMs);
    return date.toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatISODate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">認証状態を確認中...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">ログイン画面にリダイレクト中...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">フィードバックを読み込んでいます...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md">
          <div className="text-red-600 text-center">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="mt-2 text-lg font-semibold">エラーが発生しました</h2>
            <p className="mt-2 text-sm">{error}</p>
            <div className="mt-4 space-y-2">
              <Link
                href="/"
                className="block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                一覧に戻る
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!feedback) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md">
          <div className="text-gray-600 text-center">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="mt-2 text-lg font-semibold">フィードバックが見つかりません</h2>
            <Link
              href="/"
              className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              一覧に戻る
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Link
                  href="/"
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                </Link>
                <h1 className="text-2xl font-bold text-gray-900">
                  フィードバック詳細 #{feedback.id}
                </h1>
              </div>
              <button
                onClick={handleCreateTask}
                disabled={isCreatingTask}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  isCreatingTask
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
                }`}
              >
                {isCreatingTask ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    作成中...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    タスクに転送
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* タスク作成結果の通知 */}
        {taskCreationResult && (
          <div
            className={`mb-6 p-4 rounded-lg flex items-start gap-3 ${
              taskCreationResult.success
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {taskCreationResult.success ? (
              <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            <div className="flex-1">
              <p className="text-sm font-medium">{taskCreationResult.message}</p>
              {taskCreationResult.taskUrl && (
                <a
                  href={taskCreationResult.taskUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm underline hover:no-underline mt-1 inline-block"
                >
                  タスクを表示 →
                </a>
              )}
            </div>
            <button
              onClick={() => setTaskCreationResult(null)}
              className="text-sm hover:opacity-70"
            >
              ✕
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 左側: コメントとページ情報 */}
          <div className="space-y-6">
            {/* コメント */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  コメント
                </h2>
                {!isEditingComment && (
                  <button
                    onClick={startEditingComment}
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    編集
                  </button>
                )}
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                {isEditingComment ? (
                  <div className="space-y-3">
                    <textarea
                      value={editedComment}
                      onChange={(e) => setEditedComment(e.target.value)}
                      className="w-full min-h-[150px] p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y text-black"
                      placeholder="コメントを入力..."
                      disabled={isSavingComment}
                    />
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={cancelEditingComment}
                        disabled={isSavingComment}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        キャンセル
                      </button>
                      <button
                        onClick={saveComment}
                        disabled={isSavingComment}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {isSavingComment && (
                          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        )}
                        保存
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">
                    {feedback.comment}
                  </p>
                )}
              </div>
            </div>

            {/* ページ情報 */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9" />
                </svg>
                ページ情報
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">タイトル</label>
                  <p className="text-sm text-gray-800 mt-1">{feedback.screenshotData?.tabTitle || 'タイトル不明'}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">URL</label>
                  <a
                    href={feedback.screenshotData?.tabUrl || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:text-blue-800 underline break-all mt-1 block"
                  >
                    {feedback.screenshotData?.tabUrl || 'URL不明'}
                  </a>
                </div>
              </div>
            </div>

            {/* メタデータ */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                メタデータ
              </h2>
              <dl className="grid grid-cols-1 gap-4 text-sm">
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">フィードバック送信日時</dt>
                  <dd className="text-gray-800 mt-1">{formatDate(feedback.timestamp)}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">スクリーンショット撮影日時</dt>
                  <dd className="text-gray-800 mt-1">{feedback.screenshotData?.timestamp ? formatDate(feedback.screenshotData.timestamp) : '-'}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">フィードバック作成日時</dt>
                  <dd className="text-gray-800 mt-1">{formatISODate(feedback.createdAt)}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">スクリーンショットデータID</dt>
                  <dd className="text-gray-800 mt-1 text-xs font-mono">{feedback.screenshotDataId}</dd>
                </div>
                {feedback.userAgent && (
                  <div>
                    <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">User Agent</dt>
                    <dd className="text-gray-800 mt-1 text-xs font-mono break-all">{feedback.userAgent}</dd>
                  </div>
                )}
              </dl>
            </div>
          </div>

          {/* 右側: スクリーンショットとDOM */}
          <div className="space-y-6">
            {/* スクリーンショット */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                スクリーンショット
              </h2>
              <div className="bg-gray-50 rounded-lg p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={feedback.screenshotData?.screenshotUrl || ''}
                  alt="スクリーンショット"
                  className="w-full h-auto max-h-[600px] object-contain border border-gray-200 rounded-lg shadow-sm"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    // 無限ループを防ぐためのフラグ
                    if (target.dataset.errorHandled) return;
                    target.dataset.errorHandled = 'true';

                    // 正しいフォールバック用SVGを設定
                    target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+CiAgPGcgZmlsbD0iIzk5YTNhZiI+CiAgICA8c3ZnIHg9IjUwJSIgeT0iNDAlIiB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMiIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoLTIwLC0yMCkiPgogICAgICA8cGF0aCBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGQ9Im00IDE2IDQuNTg2LTQuNTg2YTIgMiAwIDEgMSAyLjgyOCAwTDE2IDE2bS0yLTJsMS41ODYtMS41ODZhMiAyIDAgMSAxIDIuODI4IDBMMjAgMTRtLTYtNmguMDFNNiAyMGgxMmEyIDIgMCAwIDAgMi0yVjZhMiAyIDAgMCAwLTItMkg2YTIgMiAwIDAgMC0yIDJ2MTJhMiAyIDAgMCAwIDIgMloiLz4KICAgIDwvc3ZnPgogIDwvZz4KICA8dGV4dCB4PSI1MCUiIHk9IjcwJSIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjE0IiBmaWxsPSIjNjk3MjgwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+44K544Kv44Oq44O844Oz44K344On44OD44OI44KS6Kqt44G/6L6844KE44G+44Gb44KT44Gn44GX44GfPC90ZXh0Pgo8L3N2Zz4K';
                  }}
                />
              </div>
            </div>

            {/* DOMツリー */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
                DOM構造
              </h2>
              <div className="bg-gray-50 rounded-lg p-4">
                <textarea
                  value={feedback.screenshotData?.domTree || ''}
                  readOnly
                  className="w-full h-96 text-xs font-mono bg-white border border-gray-200 rounded p-3 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="DOMツリーの情報"
                />
                <div className="mt-2 text-xs text-gray-500">
                  サイズ: {(feedback.screenshotData?.domTree?.length || 0).toLocaleString()} 文字
                </div>
              </div>
            </div>

            {/* ページ情報JSON */}
            {feedback.screenshotData?.pageInfo && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  ページ情報 (JSON)
                </h2>
                <div className="bg-gray-50 rounded-lg p-4">
                  <pre className="text-xs font-mono bg-white border rounded p-3 overflow-x-auto max-h-96">
                    {JSON.stringify(feedback.screenshotData?.pageInfo, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}