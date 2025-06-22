import { jest } from '@jest/globals';
import { PUT, OPTIONS } from '@/app/api/uploads/local/route';
import { createMockRequest, getResponseJson } from '../../../../utils/test-utils';
import { existsSync } from 'fs';
import { readFile, unlink } from 'fs/promises';
import { join } from 'path';

// ファイルシステム操作のテスト後クリーンアップ用
const createdFiles: string[] = [];

describe('/api/uploads/local', () => {
    afterEach(async () => {
        // テストで作成されたファイルをクリーンアップ
        for (const filePath of createdFiles) {
            try {
                if (existsSync(filePath)) {
                    await unlink(filePath);
                }
            } catch (error) {
                console.log(`クリーンアップ失敗: ${filePath}`, error);
            }
        }
        createdFiles.length = 0;
    });

    describe('PUT', () => {
        it('should upload file to local storage successfully', async () => {
            // テスト用ファイルデータ（小さなPNG画像のバイナリデータ）
            const pngData = Buffer.from([
                0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG シグネチャ
                0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
                0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // 1x1 pixel
                0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
                0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41, // IDAT chunk
                0x54, 0x08, 0x57, 0x63, 0xF8, 0x0F, 0x00, 0x00,
                0x01, 0x00, 0x01, 0x5C, 0xC2, 0x87, 0x39, 0x00,
                0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, // IEND chunk
                0x42, 0x60, 0x82
            ]);

            const fileName = 'test.png';
            const fileType = 'image/png';
            const key = `temp/test_${Date.now()}.png`;

            const request = new Request(
                `http://localhost:3300/api/uploads/local?fileName=${encodeURIComponent(fileName)}&fileType=${encodeURIComponent(fileType)}&key=${encodeURIComponent(key)}`,
                {
                    method: 'PUT',
                    body: pngData,
                    headers: {
                        'Content-Type': 'image/png',
                    },
                }
            );

            const response = await PUT(request);
            const json = await getResponseJson(response);

            expect(response.status).toBe(200);
            expect(json.success).toBe(true);
            expect(json.key).toBe(key);
            expect(json.fileUrl).toBe(`http://localhost:3300/uploads/${key}`);
            expect(json.message).toBe('ファイルをローカルに保存しました');

            // ファイルが実際に保存されたかチェック
            const savedFilePath = join(process.cwd(), 'public', 'uploads', key);
            expect(existsSync(savedFilePath)).toBe(true);

            // ファイル内容が正しいかチェック
            const savedData = await readFile(savedFilePath);
            expect(savedData).toEqual(pngData);

            // クリーンアップリストに追加
            createdFiles.push(savedFilePath);
        });

        it('should upload file with default parameters', async () => {
            const testData = Buffer.from('test file content', 'utf-8');

            const request = new Request('http://localhost:3300/api/uploads/local', {
                method: 'PUT',
                body: testData,
                headers: {
                    'Content-Type': 'text/plain',
                },
            });

            const response = await PUT(request);
            const json = await getResponseJson(response);

            expect(response.status).toBe(200);
            expect(json.success).toBe(true);
            expect(json.key).toMatch(/^temp\/\d+\.png$/);
            expect(json.fileUrl).toMatch(/^http:\/\/localhost:3300\/uploads\/temp\/\d+\.png$/);

            // ファイルが実際に保存されたかチェック
            const savedFilePath = join(process.cwd(), 'public', 'uploads', json.key);
            expect(existsSync(savedFilePath)).toBe(true);

            // クリーンアップリストに追加
            createdFiles.push(savedFilePath);
        });

        it('should create directory structure if not exists', async () => {
            const testData = Buffer.from('test file content', 'utf-8');
            const key = 'feedbacks/2024/12/18/test_123456789.png';

            const request = new Request(
                `http://localhost:3300/api/uploads/local?key=${encodeURIComponent(key)}`,
                {
                    method: 'PUT',
                    body: testData,
                }
            );

            const response = await PUT(request);
            const json = await getResponseJson(response);

            expect(response.status).toBe(200);
            expect(json.success).toBe(true);
            expect(json.key).toBe(key);

            // ファイルとディレクトリが作成されたかチェック
            const savedFilePath = join(process.cwd(), 'public', 'uploads', key);
            expect(existsSync(savedFilePath)).toBe(true);

            // ディレクトリ構造が作成されたかチェック
            const dirPath = join(process.cwd(), 'public', 'uploads', 'feedbacks', '2024', '12', '18');
            expect(existsSync(dirPath)).toBe(true);

            // クリーンアップリストに追加
            createdFiles.push(savedFilePath);
        });

        it('should handle large file upload', async () => {
            // 10KB のテストデータ
            const largeData = Buffer.alloc(10 * 1024, 'A');
            const key = 'temp/large_file.bin';

            const request = new Request(
                `http://localhost:3300/api/uploads/local?fileName=large_file.bin&fileType=application/octet-stream&key=${encodeURIComponent(key)}`,
                {
                    method: 'PUT',
                    body: largeData,
                }
            );

            const response = await PUT(request);
            const json = await getResponseJson(response);

            expect(response.status).toBe(200);
            expect(json.success).toBe(true);
            expect(json.key).toBe(key);

            // ファイルサイズが正しいかチェック
            const savedFilePath = join(process.cwd(), 'public', 'uploads', key);
            expect(existsSync(savedFilePath)).toBe(true);

            const savedData = await readFile(savedFilePath);
            expect(savedData.length).toBe(largeData.length);

            // クリーンアップリストに追加
            createdFiles.push(savedFilePath);
        });

        it('should return 400 when invalid file path is provided', async () => {
            // 無効なファイルパスを使用してセキュリティエラーを発生させる
            const testData = Buffer.from('test');
            const invalidKey = '../../../invalid/path.txt';

            const request = new Request(
                `http://localhost:3300/api/uploads/local?key=${encodeURIComponent(invalidKey)}`,
                {
                    method: 'PUT',
                    body: testData,
                }
            );

            const response = await PUT(request);
            const json = await getResponseJson(response);

            expect(response.status).toBe(400);
            expect(json.error).toBe('不正なファイルパスです');
            expect(json.details).toBe('ファイルパスに無効な文字が含まれています');
        });

        it('should reject absolute paths', async () => {
            const testData = Buffer.from('test');
            const invalidKey = '/etc/passwd';

            const request = new Request(
                `http://localhost:3300/api/uploads/local?key=${encodeURIComponent(invalidKey)}`,
                {
                    method: 'PUT',
                    body: testData,
                }
            );

            const response = await PUT(request);
            const json = await getResponseJson(response);

            expect(response.status).toBe(400);
            expect(json.error).toBe('不正なファイルパスです');
        });

        it('should reject backslash paths', async () => {
            const testData = Buffer.from('test');
            const invalidKey = 'temp\\..\\sensitive.txt';

            const request = new Request(
                `http://localhost:3300/api/uploads/local?key=${encodeURIComponent(invalidKey)}`,
                {
                    method: 'PUT',
                    body: testData,
                }
            );

            const response = await PUT(request);
            const json = await getResponseJson(response);

            expect(response.status).toBe(400);
            expect(json.error).toBe('不正なファイルパスです');
        });

        it('should handle empty file upload', async () => {
            const emptyData = Buffer.alloc(0);
            const key = 'temp/empty_file.txt';

            const request = new Request(
                `http://localhost:3300/api/uploads/local?key=${encodeURIComponent(key)}`,
                {
                    method: 'PUT',
                    body: emptyData,
                }
            );

            const response = await PUT(request);
            const json = await getResponseJson(response);

            expect(response.status).toBe(200);
            expect(json.success).toBe(true);
            expect(json.key).toBe(key);

            // ファイルが作成されたかチェック
            const savedFilePath = join(process.cwd(), 'public', 'uploads', key);
            expect(existsSync(savedFilePath)).toBe(true);

            // ファイルサイズが0であることをチェック
            const savedData = await readFile(savedFilePath);
            expect(savedData.length).toBe(0);

            // クリーンアップリストに追加
            createdFiles.push(savedFilePath);
        });
    });

    describe('OPTIONS (CORS)', () => {
        it('should handle preflight request correctly', async () => {
            const request = new Request('http://localhost:3300/api/uploads/local', {
                method: 'OPTIONS',
            });

            const response = await OPTIONS(request);

            expect(response.status).toBe(200);
            expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
            expect(response.headers.get('Access-Control-Allow-Methods')).toContain('PUT');
            expect(response.headers.get('Access-Control-Allow-Headers')).toContain('Content-Type');
        });
    });
}); 