# Vibe Kanban Makefile

.PHONY: help install dev dev-dynamic build lint test deploy-dev

# デフォルトターゲット: ヘルプを表示
help:
	@echo "=== Vibe Kanban 開発支援コマンド ==="
	@echo "make install      - 依存関係をインストール"
	@echo "make dev          - 開発サーバーを起動（ポート3300）"
	@echo "make dev-dynamic  - 開発サーバーを動的ポートで起動"
	@echo "make build        - プロダクションビルドを実行"
	@echo "make lint         - コードの静的解析を実行"
	@echo "make test         - テストを実行"
	@echo "make db-migrate   - データベースマイグレーションを実行"
	@echo "make db-seed      - シードデータを投入"

# 依存関係のインストール
install:
	@echo "依存関係をインストール中..."
	npm install
	@echo "Prisma Clientを生成中..."
	npx prisma generate
	@echo "依存関係のインストールが完了しました"

# 開発サーバーの起動（固定ポート）
dev:
	@echo "開発サーバーを起動中..."
	@echo "URL: http://localhost:3300"
	@echo "サーバーを終了するには Ctrl+C を押してください"
	npm run dev

# 動的ポートで開発サーバーの起動
dev-dynamic:
	@./start-dev-dynamic.sh

# ビルド
build:
	@echo "プロダクションビルドを実行中..."
	npm run build
	@echo "ビルドが完了しました"

# 静的解析
lint:
	@echo "静的解析を実行中..."
	npm run lint

# テスト
test:
	@echo "テストを実行中..."
	npm test

# データベースマイグレーション
db-migrate:
	@echo "データベースマイグレーションを実行中..."
	npx prisma migrate dev

# シードデータ投入
db-seed:
	@echo "シードデータを投入中..."
	npx prisma db seed

# 開発環境へのデプロイ
deploy-dev:
	@echo "開発環境へのデプロイを開始..."
	@./deploy-scripts/deploy-heroku.sh
	@echo "デプロイが完了しました"