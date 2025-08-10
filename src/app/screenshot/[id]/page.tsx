'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';

interface ScreenshotData {
  id: string;
  screenshotUrl: string;
  tabUrl: string;
  tabTitle: string;
  timestamp: number;
  pageInfo?: any;
}

export default function ScreenshotDetailPage() {
  const params = useParams();
  const router = useRouter();
  const screenshotId = params.id as string;
  
  const [screenshotData, setScreenshotData] = useState<ScreenshotData | null>(null);
  const [comment, setComment] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // スクリーンショットデータの取得
  useEffect(() => {
    const fetchScreenshotData = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/screenshot/${screenshotId}`);
        
        if (!response.ok) {
          throw new Error('スクリーンショットデータの取得に失敗しました');
        }
        
        const data = await response.json();
        setScreenshotData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : '予期しないエラーが発生しました');
      } finally {
        setIsLoading(false);
      }
    };

    if (screenshotId) {
      fetchScreenshotData();
    }
  }, [screenshotId]);

  // フィードバックの送信
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!comment.trim()) {
      setError('コメントを入力してください');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          comment: comment.trim(),
          uploadedDataId: screenshotId,  // Chrome Extensionとの互換性のため
          timestamp: Date.now(),
          userAgent: navigator.userAgent,
          url: screenshotData?.tabUrl || '',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'フィードバックの送信に失敗しました');
      }

      const result = await response.json();
      setSuccessMessage('フィードバックを送信しました');
      setComment('');
      
      // 成功メッセージを表示した後、少し待ってから戻る
      setTimeout(() => {
        // Chrome Extensionから来た場合はwindow.closeを試みる
        if (window.opener === null && window.history.length === 1) {
          window.close();
        } else {
          // それ以外の場合はトップページへ
          router.push('/');
        }
      }, 2000);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : '予期しないエラーが発生しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (error && !screenshotData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
          <div className="text-red-600 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-center text-gray-900 mb-2">エラー</h1>
          <p className="text-center text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* ヘッダー */}
          <div className="bg-blue-600 text-white p-6">
            <h1 className="text-2xl font-bold">フィードバック詳細入力</h1>
            <p className="mt-2 text-blue-100">スクリーンショットを確認してコメントを入力してください</p>
          </div>

          {/* メインコンテンツ */}
          <div className="p-6">
            {/* ページ情報 */}
            {screenshotData && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h2 className="text-lg font-semibold text-gray-900 mb-2">ページ情報</h2>
                <dl className="space-y-2">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">タイトル:</dt>
                    <dd className="text-sm text-gray-900">{screenshotData.tabTitle || '(タイトルなし)'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">URL:</dt>
                    <dd className="text-sm text-gray-900 break-all">
                      <a href={screenshotData.tabUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        {screenshotData.tabUrl}
                      </a>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">撮影日時:</dt>
                    <dd className="text-sm text-gray-900">
                      {new Date(screenshotData.timestamp * 1000).toLocaleString('ja-JP')}
                    </dd>
                  </div>
                </dl>
              </div>
            )}

            {/* スクリーンショット */}
            {screenshotData && (
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-2">スクリーンショット</h2>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={screenshotData.screenshotUrl}
                    alt="スクリーンショット"
                    className="w-full h-auto"
                  />
                </div>
              </div>
            )}

            {/* コメント入力フォーム */}
            <form onSubmit={handleSubmit}>
              <div className="mb-6">
                <label htmlFor="comment" className="block text-lg font-semibold text-gray-900 mb-2">
                  コメント
                </label>
                <textarea
                  id="comment"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={6}
                  className="w-full px-3 py-2 text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="フィードバックやご意見をお聞かせください..."
                  disabled={isSubmitting}
                  required
                />
              </div>

              {/* エラーメッセージ */}
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              {/* 成功メッセージ */}
              {successMessage && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-600">{successMessage}</p>
                </div>
              )}

              {/* ボタン */}
              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`flex-1 py-3 px-6 rounded-lg font-medium text-white transition-colors ${
                    isSubmitting 
                      ? 'bg-gray-400 cursor-not-allowed' 
                      : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800'
                  }`}
                >
                  {isSubmitting ? '送信中...' : 'フィードバックを送信'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (window.opener === null && window.history.length === 1) {
                      window.close();
                    } else {
                      router.push('/');
                    }
                  }}
                  disabled={isSubmitting}
                  className="px-6 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                >
                  キャンセル
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}