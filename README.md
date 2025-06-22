# 📋 フィードバック管理システム (Prisma + MySQL + S3)

Chrome Extensionから送信されたフィードバックを保存・管理するNext.jsアプリケーションです。

## ✨ 機能

- 📨 Chrome Extensionからのフィードバック受信API
- 📊 統計ダッシュボード（総数、今日、今週の件数）
- 📋 フィードバック一覧表示
- 🔍 詳細情報の表示（コメント、スクリーンショット、メタデータ）
- 🗑️ フィードバックの削除機能
- 🗄️ Prisma + MySQLによるデータ永続化
- 📸 AWS S3によるスクリーンショット保存
- 🎨 レスポンシブ対応のモダンUI

## 🏗️ アーキテクチャ

```
Chrome Extension → API → Prisma → MySQL
                    ↓
                  S3 (画像保存)
                    ↓
               Dashboard (管理画面)
```

## 🚀 セットアップ

### 1. 前提条件

- Node.js 18+
- MySQL 8.0+
- AWS S3アカウント

### 2. データベース作成

MySQLでデータベースを作成：

\`\`\`sql
CREATE DATABASE `test-suite` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
\`\`\`

### 3. 環境変数設定

\`.env\`ファイルを作成し、以下の内容を設定：

\`\`\`env
# Database
DATABASE_URL="mysql://root:secret@localhost:3306/test-suite?schema=public&sslmode=prefer"

# AWS S3 Configuration
AWS_REGION="ap-northeast-1"
AWS_ACCESS_KEY_ID="your-access-key-id"
AWS_SECRET_ACCESS_KEY="your-secret-access-key"
AWS_S3_BUCKET_NAME="your-bucket-name"
\`\`\`

### 4. 依存関係のインストール

\`\`\`bash
npm install
\`\`\`

### 5. データベースマイグレーション

\`\`\`bash
npx prisma migrate dev
npx prisma generate
\`\`\`

### 6. 開発サーバーの起動

\`\`\`bash
npm run dev
\`\`\`

アプリケーションは \`http://localhost:3300\` で起動します。

## 🔌 API エンドポイント

### フィードバック受信
- **URL**: \`POST /api/feedback\`
- **説明**: Chrome Extensionからのフィードバックを受信
- **CORS対応**: ✅
- **リクエスト形式**:
\`\`\`json
{
  "comment": "ユーザーのコメント",
  "screenshotUrl": "https://bucket.s3.region.amazonaws.com/path/to/image.png",
  "metadata": {
    "url": "https://example.com",
    "title": "ページタイトル",
    "timestamp": 1640995200000,
    "userAgent": "Mozilla/5.0..."
  }
}
\`\`\`

### S3プリサインURL生成
- **URL**: \`POST /api/s3/presigned-url\`
- **説明**: S3アップロード用のプリサインURLを生成
- **リクエスト形式**:
\`\`\`json
{
  "fileName": "screenshot.png",
  "fileType": "image/png",
  "feedbackId": 123
}
\`\`\`

### フィードバック一覧取得
- **URL**: \`GET /api/feedback/list\`
- **説明**: 保存されたフィードバック一覧と統計情報を取得

### フィードバック削除
- **URL**: \`DELETE /api/feedback/[id]\`
- **説明**: 指定されたIDのフィードバックを削除

## 🗄️ データベーススキーマ

### feedbacks テーブル

| カラム名 | 型 | 説明 |
|----------|----|----|
| id | INT | 主キー（自動増分） |
| comment | TEXT | コメント内容 |
| screenshot_url | VARCHAR(500) | S3画像URL |
| tab_url | VARCHAR(2000) | ページURL |
| tab_title | VARCHAR(500) | ページタイトル |
| timestamp | BIGINT | 送信時のタイムスタンプ |
| user_agent | TEXT | ユーザーエージェント |
| created_at | DATETIME | 作成日時 |
| updated_at | DATETIME | 更新日時 |

## 📸 S3画像管理

### ディレクトリ構造

\`\`\`
bucket-name/
├── feedbacks/
│   ├── 2024/
│   │   ├── 01/
│   │   │   ├── 01/
│   │   │   │   ├── 1_1640995200000.png
│   │   │   │   └── 2_1640995300000.png
│   │   │   └── 02/
│   │   └── 02/
│   └── temp/ (一時ファイル)
\`\`\`

### プリサインURL

- **有効期限**: 15分
- **アクセス制御**: プライベート
- **直接アップロード**: ブラウザから直接S3にアップロード

## 🎯 使用方法

### 1. 開発サーバーを起動
\`\`\`bash
npm run dev
\`\`\`

### 2. Chrome Extensionでフィードバックを送信
- 拡張機能を使用してコメント入力
- 自動でスクリーンショット取得
- S3にアップロード後、メタデータをMySQLに保存

### 3. ダッシュボードでフィードバックを確認
- \`http://localhost:3300\` にアクセス
- 統計情報とフィードバック一覧を確認
- S3画像の表示と管理

### 4. フィードバックの管理
- 一覧からフィードバックを選択して詳細を確認
- 不要なフィードバックを削除

## 📁 ディレクトリ構造

\`\`\`
nextjs/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── feedback/
│   │   │   │   ├── route.ts          # フィードバック受信API
│   │   │   │   ├── list/
│   │   │   │   │   └── route.ts      # 一覧取得API
│   │   │   │   └── [id]/
│   │   │   │       └── route.ts      # 削除API
│   │   │   └── s3/
│   │   │       └── presigned-url/
│   │   │           └── route.ts      # S3プリサインURL API
│   │   ├── globals.css               # グローバルスタイル
│   │   ├── layout.tsx                # ルートレイアウト
│   │   └── page.tsx                  # メインダッシュボード
│   ├── lib/
│   │   ├── prisma.ts                 # Prismaクライアント
│   │   ├── database.ts               # データベース操作
│   │   └── s3.ts                     # S3操作
├── prisma/
│   ├── schema.prisma                 # Prismaスキーマ
│   └── migrations/                   # マイグレーションファイル
├── .env                              # 環境変数
├── package.json
└── README.md
\`\`\`

## 🛡️ セキュリティ

- **データベース**: MySQLのutf8mb4文字セット使用
- **S3アクセス**: プリサインURLによる時間制限付きアクセス
- **CORS設定**: Chrome Extensionからのリクエストを許可
- **入力検証**: 全APIエンドポイントで適切な検証
- **エラーハンドリング**: 詳細なログとエラー処理

## 📊 統計機能

- **総フィードバック数**: Prismaによる高速カウント
- **今日の件数**: 日付フィルタリング
- **今週の件数**: 7日間のデータ集計

## ⚙️ 技術スタック

- ⚡ **Next.js 15.3.3** (App Router)
- 📘 **TypeScript**
- 🎨 **Tailwind CSS**
- 🗄️ **Prisma ORM** + **MySQL**
- 📸 **AWS S3** (プリサインURL)
- 🌐 **CORS対応**

## 🚀 デプロイメント

### プロダクション環境

1. **環境変数の設定**
   - 本番用のMySQL接続情報
   - 本番用のS3バケット情報

2. **ビルドとデプロイ**
   \`\`\`bash
   npm run build
   npm start
   \`\`\`

3. **マイグレーション**
   \`\`\`bash
   npx prisma migrate deploy
   \`\`\`

## ⚠️ 注意事項

- MySQLサーバーが localhost:3306 で起動している必要があります
- AWS S3バケットが作成済みで、適切な権限が設定されている必要があります
- Chrome Extensionのmanifestでローカルホストへのアクセスを許可してください
- プロダクション環境では適切なログ収集とモニタリングを設定してください

## 🤝 Chrome Extensionとの連携

このアプリケーションは、Chrome Extensionと完全に統合されています：

1. **画像アップロード**: S3プリサインURLで直接アップロード
2. **メタデータ保存**: PrismaでMySQLに永続化
3. **リアルタイム管理**: ダッシュボードで即座に確認・管理

### データフロー

\`\`\`
Chrome Extension
    ↓ (スクリーンショット取得)
S3プリサインURL API
    ↓ (プリサインURL取得)
Chrome Extension
    ↓ (S3に直接アップロード)
フィードバック受信API
    ↓ (メタデータ保存)
MySQL Database
    ↓ (データ表示)
管理ダッシュボード
\`\`\`

完全なエンタープライズ級フィードバック収集・管理システムが構築されました！🎉
