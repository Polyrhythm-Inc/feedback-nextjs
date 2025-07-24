'use client';

import { useEffect, useState } from 'react';

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

interface ErrorLog {
  id: string;
  source: 'chrome-extension' | 's3-upload' | 'api' | 'unknown';
  level: 'error' | 'warning' | 'info';
  message: string;
  details?: any;
  url?: string;
  userAgent?: string;
  timestamp: number;
}

export default function Home() {
  const [feedbacks, setFeedbacks] = useState<FeedbackRecord[]>([]);
  const [errorLogs, setErrorLogs] = useState<ErrorLog[]>([]);
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackRecord | null>(null);
  const [selectedErrorLog, setSelectedErrorLog] = useState<ErrorLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'feedback' | 'logs'>('feedback');
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [taskCreationResult, setTaskCreationResult] = useState<{ success: boolean; message: string; taskUrl?: string } | null>(null);
  const [isEditingComment, setIsEditingComment] = useState(false);
  const [editedComment, setEditedComment] = useState('');
  const [isSavingComment, setIsSavingComment] = useState(false);

  // フィードバック一覧の取得
  const fetchFeedbacks = async () => {
    try {
      const response = await fetch('/api/feedback/list');

      if (!response.ok) {
        throw new Error(`フィードバック取得エラー: ${response.status}`);
      }

      const data = await response.json();

      if (data.success && Array.isArray(data.feedbacks)) {
        setFeedbacks(data.feedbacks);
      } else {
        throw new Error('フィードバックデータの形式が不正です');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '不明なエラー';
      setError(errorMessage);
      console.error('フィードバック取得エラー:', err);
    }
  };

  // エラーログ一覧の取得
  const fetchErrorLogs = async () => {
    try {
      const response = await fetch('/api/logs?limit=100');

      if (!response.ok) {
        throw new Error(`エラーログ取得エラー: ${response.status}`);
      }

      const data = await response.json();

      if (data.success && Array.isArray(data.logs)) {
        setErrorLogs(data.logs);
      } else {
        throw new Error('エラーログデータの形式が不正です');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '不明なエラー';
      setError(errorMessage);
      console.error('エラーログ取得エラー:', err);
    }
  };

  // タスク作成処理
  const handleCreateTask = async () => {
    if (!selectedFeedback) return;

    setIsCreatingTask(true);
    setTaskCreationResult(null);

    try {
      const response = await fetch(`/api/feedback/${selectedFeedback.id}/create-task`, {
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

  // フィードバック選択時にタスク作成結果をクリア
  useEffect(() => {
    setTaskCreationResult(null);
  }, [selectedFeedback]);

  // コメント編集を開始
  const startEditingComment = () => {
    if (selectedFeedback) {
      setEditedComment(selectedFeedback.comment);
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
    if (!selectedFeedback || isSavingComment) return;

    setIsSavingComment(true);
    try {
      const response = await fetch(`/api/feedback/${selectedFeedback.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ comment: editedComment }),
      });

      if (!response.ok) {
        throw new Error('コメントの更新に失敗しました');
      }

      // 更新成功後、フィードバックリストを再取得
      await fetchFeedbacks();
      
      // 選択中のフィードバックを更新（コメントを即座に反映）
      setSelectedFeedback({ ...selectedFeedback, comment: editedComment });

      setIsEditingComment(false);
      setEditedComment('');
    } catch (error) {
      console.error('コメント更新エラー:', error);
      alert('コメントの更新に失敗しました');
    } finally {
      setIsSavingComment(false);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchFeedbacks(), fetchErrorLogs()]);
      setLoading(false);
    };

    loadData();
  }, []);

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

  const getLevelBadgeColor = (level: string) => {
    switch (level) {
      case 'error': return 'bg-red-100 text-red-800';
      case 'warning': return 'bg-yellow-100 text-yellow-800';
      case 'info': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getSourceBadgeColor = (source: string) => {
    switch (source) {
      case 'chrome-extension': return 'bg-green-100 text-green-800';
      case 's3-upload': return 'bg-purple-100 text-purple-800';
      case 'api': return 'bg-indigo-100 text-indigo-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">データを読み込んでいます...</p>
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
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              再読み込み
            </button>
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
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              フィードバック管理システム
            </h1>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* タブナビゲーション */}
        <div className="mb-8">
          <div className="sm:hidden">
            <select
              value={activeTab}
              onChange={(e) => setActiveTab(e.target.value as 'feedback' | 'logs')}
              className="block w-full rounded-md border-gray-300 focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="feedback">📝 フィードバック ({feedbacks.length})</option>
              <option value="logs">🔍 エラーログ ({errorLogs.length})</option>
            </select>
          </div>
          <div className="hidden sm:block">
            <nav className="flex space-x-1" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('feedback')}
                className={`${activeTab === 'feedback'
                  ? 'bg-blue-100 text-blue-700 border-blue-500'
                  : 'text-gray-500 hover:text-gray-700 border-transparent hover:border-gray-300'
                  } px-6 py-3 border-b-2 font-medium text-sm transition-colors duration-200 flex items-center gap-2`}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                フィードバック
                <span className="bg-gray-100 text-gray-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                  {feedbacks.length}
                </span>
              </button>
              <button
                onClick={() => setActiveTab('logs')}
                className={`${activeTab === 'logs'
                  ? 'bg-blue-100 text-blue-700 border-blue-500'
                  : 'text-gray-500 hover:text-gray-700 border-transparent hover:border-gray-300'
                  } px-6 py-3 border-b-2 font-medium text-sm transition-colors duration-200 flex items-center gap-2`}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                エラーログ
                <span className="bg-gray-100 text-gray-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                  {errorLogs.length}
                </span>
              </button>
            </nav>
          </div>
        </div>

        {/* フィードバックタブ */}
        {activeTab === 'feedback' && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            {/* フィードバック一覧 */}
            <div className="xl:col-span-1">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                    </svg>
                    フィードバック一覧
                  </h2>
                </div>

                <div className="p-6">
                  {feedbacks.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <h3 className="text-sm font-medium text-gray-900 mb-1">まだフィードバックがありません</h3>
                      <p className="text-xs text-gray-500">Chrome Extensionからフィードバックが送信されると、ここに表示されます</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {feedbacks.map((feedback) => (
                        <div
                          key={feedback.id}
                          onClick={() => setSelectedFeedback(feedback)}
                          className={`group p-4 rounded-lg border cursor-pointer transition-all duration-200 ${selectedFeedback?.id === feedback.id
                            ? 'border-blue-500 bg-blue-50 shadow-md'
                            : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                            }`}
                        >
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-medium px-2 py-1 rounded-full ${selectedFeedback?.id === feedback.id
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-600 group-hover:bg-gray-200'
                                }`}>
                                #{feedback.id}
                              </span>
                            </div>
                            <span className="text-xs text-gray-500">
                              {formatDate(feedback.timestamp)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-900 line-clamp-2 mb-3 leading-relaxed">
                            {feedback.comment}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9" />
                            </svg>
                            <span className="truncate">{feedback.screenshotData.tabTitle}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* フィードバック詳細 */}
            <div className="xl:col-span-2">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    詳細情報
                  </h2>
                  {selectedFeedback && (
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
                  )}
                </div>

                <div className="p-6">
                  {/* タスク作成結果の通知 */}
                  {taskCreationResult && (
                    <div
                      className={`mb-4 p-4 rounded-lg flex items-start gap-3 ${
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

                  {selectedFeedback ? (
                    <div className="space-y-6">
                      {/* コメント */}
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-sm font-medium text-gray-900 flex items-center gap-2">
                            <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                            コメント
                          </h3>
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
                                className="w-full min-h-[100px] p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y text-black"
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
                              {selectedFeedback.comment}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* ページ情報 */}
                      <div>
                        <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
                          <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9" />
                          </svg>
                          ページ情報
                        </h3>
                        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                          <div>
                            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">タイトル</label>
                            <p className="text-sm text-gray-800 mt-1">{selectedFeedback.screenshotData.tabTitle}</p>
                          </div>
                          <div>
                            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">URL</label>
                            <a
                              href={selectedFeedback.screenshotData.tabUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-blue-600 hover:text-blue-800 underline break-all mt-1 block"
                            >
                              {selectedFeedback.screenshotData.tabUrl}
                            </a>
                          </div>
                        </div>
                      </div>

                      {/* スクリーンショット */}
                      <div>
                        <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
                          <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          スクリーンショット
                        </h3>
                        <div className="bg-gray-50 rounded-lg p-4">
                          <img
                            src={selectedFeedback.screenshotData.screenshotUrl}
                            alt="スクリーンショット"
                            className="max-w-full h-auto max-h-80 object-contain border border-gray-200 rounded-lg shadow-sm"
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
                      <div>
                        <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
                          <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                          </svg>
                          DOM構造
                        </h3>
                        <div className="bg-gray-50 rounded-lg p-4">
                          <textarea
                            value={selectedFeedback.screenshotData.domTree}
                            readOnly
                            className="w-full h-64 text-xs font-mono bg-white border border-gray-200 rounded p-3 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="DOMツリーの情報"
                          />
                          <div className="mt-2 text-xs text-gray-500">
                            サイズ: {selectedFeedback.screenshotData.domTree.length.toLocaleString()} 文字
                          </div>
                        </div>
                      </div>

                      {/* メタデータ */}
                      <div>
                        <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
                          <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          メタデータ
                        </h3>
                        <div className="bg-gray-50 rounded-lg p-4">
                          <dl className="grid grid-cols-1 gap-3 text-sm">
                            <div>
                              <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">フィードバック送信日時</dt>
                              <dd className="text-gray-800 mt-1">{formatDate(selectedFeedback.timestamp)}</dd>
                            </div>
                            <div>
                              <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">スクリーンショット撮影日時</dt>
                              <dd className="text-gray-800 mt-1">{formatDate(selectedFeedback.screenshotData.timestamp)}</dd>
                            </div>
                            <div>
                              <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">フィードバック作成日時</dt>
                              <dd className="text-gray-800 mt-1">{formatISODate(selectedFeedback.createdAt)}</dd>
                            </div>
                            <div>
                              <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">スクリーンショットデータID</dt>
                              <dd className="text-gray-800 mt-1 text-xs font-mono">{selectedFeedback.screenshotDataId}</dd>
                            </div>
                            {selectedFeedback.userAgent && (
                              <div>
                                <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">User Agent</dt>
                                <dd className="text-gray-800 mt-1 text-xs font-mono break-all">{selectedFeedback.userAgent}</dd>
                              </div>
                            )}
                            {selectedFeedback.screenshotData.pageInfo && (
                              <div>
                                <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">ページ情報 (JSON)</dt>
                                <dd className="text-gray-800 mt-1">
                                  <pre className="text-xs font-mono bg-white border rounded p-2 overflow-x-auto">
                                    {JSON.stringify(selectedFeedback.screenshotData.pageInfo, null, 2)}
                                  </pre>
                                </dd>
                              </div>
                            )}
                          </dl>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-16">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <h3 className="text-sm font-medium text-gray-900 mb-1">フィードバックを選択してください</h3>
                      <p className="text-xs text-gray-500">左側の一覧からフィードバックを選択すると詳細情報が表示されます</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* エラーログタブ */}
        {activeTab === 'logs' && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            {/* エラーログ一覧 */}
            <div className="xl:col-span-1">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    エラーログ一覧
                  </h2>
                </div>

                <div className="p-6">
                  {errorLogs.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <h3 className="text-sm font-medium text-gray-900 mb-1">エラーログはありません</h3>
                      <p className="text-xs text-gray-500">システムに問題がある場合、エラーログがここに表示されます</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {errorLogs.map((log) => (
                        <div
                          key={log.id}
                          onClick={() => setSelectedErrorLog(log)}
                          className={`group p-4 rounded-lg border cursor-pointer transition-all duration-200 ${selectedErrorLog?.id === log.id
                            ? 'border-blue-500 bg-blue-50 shadow-md'
                            : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                            }`}
                        >
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex gap-2">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${getLevelBadgeColor(log.level)}`}>
                                {log.level.toUpperCase()}
                              </span>
                              <span className={`px-2 py-1 rounded text-xs font-medium ${getSourceBadgeColor(log.source)}`}>
                                {log.source}
                              </span>
                            </div>
                            <span className="text-xs text-gray-500">
                              {formatDate(log.timestamp)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-900 line-clamp-2 leading-relaxed">
                            {log.message}
                          </p>
                          {log.url && (
                            <div className="flex items-center gap-2 text-xs text-gray-500 mt-2">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9" />
                              </svg>
                              <span className="truncate">{log.url}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* エラーログ詳細 */}
            <div className="xl:col-span-2">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    ログ詳細
                  </h2>
                </div>

                <div className="p-6">
                  {selectedErrorLog ? (
                    <div className="space-y-6">
                      {/* バッジ */}
                      <div className="flex gap-3">
                        <span className={`px-3 py-1 rounded-lg text-sm font-medium ${getLevelBadgeColor(selectedErrorLog.level)}`}>
                          {selectedErrorLog.level.toUpperCase()}
                        </span>
                        <span className={`px-3 py-1 rounded-lg text-sm font-medium ${getSourceBadgeColor(selectedErrorLog.source)}`}>
                          {selectedErrorLog.source}
                        </span>
                      </div>

                      {/* メッセージ */}
                      <div>
                        <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
                          <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                          エラーメッセージ
                        </h3>
                        <div className="bg-gray-50 rounded-lg p-4">
                          <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">
                            {selectedErrorLog.message}
                          </p>
                        </div>
                      </div>

                      {/* URL */}
                      {selectedErrorLog.url && (
                        <div>
                          <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
                            <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9" />
                            </svg>
                            URL
                          </h3>
                          <div className="bg-gray-50 rounded-lg p-4">
                            <a
                              href={selectedErrorLog.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 underline text-sm break-all"
                            >
                              {selectedErrorLog.url}
                            </a>
                          </div>
                        </div>
                      )}

                      {/* 詳細情報 */}
                      {selectedErrorLog.details && (
                        <div>
                          <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
                            <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            詳細情報
                          </h3>
                          <div className="bg-gray-50 rounded-lg p-4">
                            <pre className="text-xs text-gray-600 overflow-auto max-h-64 font-mono">
                              {JSON.stringify(selectedErrorLog.details, null, 2)}
                            </pre>
                          </div>
                        </div>
                      )}

                      {/* メタデータ */}
                      <div>
                        <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
                          <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          メタデータ
                        </h3>
                        <div className="bg-gray-50 rounded-lg p-4">
                          <dl className="grid grid-cols-1 gap-3 text-sm">
                            <div>
                              <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">ID</dt>
                              <dd className="text-gray-800 mt-1">{selectedErrorLog.id}</dd>
                            </div>
                            <div>
                              <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">発生日時</dt>
                              <dd className="text-gray-800 mt-1">{formatDate(selectedErrorLog.timestamp)}</dd>
                            </div>
                            {selectedErrorLog.userAgent && (
                              <div>
                                <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">User Agent</dt>
                                <dd className="text-gray-800 mt-1 text-xs font-mono break-all">{selectedErrorLog.userAgent}</dd>
                              </div>
                            )}
                          </dl>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-16">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <h3 className="text-sm font-medium text-gray-900 mb-1">エラーログを選択してください</h3>
                      <p className="text-xs text-gray-500">左側の一覧からエラーログを選択すると詳細情報が表示されます</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
