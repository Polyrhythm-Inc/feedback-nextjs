// Optional: configure or set up a testing framework before each test.
// If you delete this file, remove `setupFilesAfterEnv` from `jest.config.js`

// Used for __tests__/testing-library.js
// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'

// Mock環境変数
process.env.DATABASE_URL = 'mysql://test:test@localhost:3306/test'
process.env.AWS_REGION = 'us-east-1'
process.env.AWS_ACCESS_KEY_ID = 'test-access-key'
process.env.AWS_SECRET_ACCESS_KEY = 'test-secret-key'
process.env.AWS_S3_BUCKET_NAME = 'test-bucket' 