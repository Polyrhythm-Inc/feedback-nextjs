export default function AccessDenied() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md">
        <div className="text-center">
          <svg className="mx-auto h-12 w-12 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h2 className="mt-4 text-xl font-semibold text-gray-900">アクセス権限がありません</h2>
          <p className="mt-2 text-sm text-gray-600">
            このページへのアクセスにはパワーユーザー権限が必要です。
          </p>
          <p className="mt-4 text-xs text-gray-500">
            権限の付与については、システム管理者にお問い合わせください。
          </p>
        </div>
      </div>
    </div>
  );
}