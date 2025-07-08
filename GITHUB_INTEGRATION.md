# GitHub Integration for Feedback System

This document explains how to set up and use the automatic GitHub issues creation feature for the feedback system.

## Overview

When feedback is submitted through the Chrome extension, the system will automatically:

1. Extract the domain from the feedback's webpage URL
2. Match it against registered projects in the authentication server
3. Create a GitHub issue in the corresponding repository if a match is found

## Setup

### 1. Environment Variables

Add the following environment variables to your `.env` file:

```env
# GitHub API Configuration
GITHUB_TOKEN="your-github-personal-access-token"

# Auth Server Configuration
AUTH_SERVER_URL="https://auth-suite-2e3c739664f5.herokuapp.com"
AUTH_SERVER_TOKEN="your-auth-server-api-token"
```

### 2. GitHub Personal Access Token

1. Go to GitHub → Settings → Developer settings → Personal access tokens
2. Generate a new token with the following scopes:
   - `repo` (Full control of private repositories)
   - `public_repo` (Access public repositories)
3. Copy the token and add it to your environment variables

### 3. Auth Server Token

Use the provided auth server token that allows access to the projects API:

```bash
curl -X GET https://auth-suite-2e3c739664f5.herokuapp.com/api/projects \
  -H "Authorization: Bearer kIfRiS5xHSQvJf5qEJdfHQR8LVVGho3y"
```

## How It Works

### Project Matching

The system matches feedback URLs to projects using the following logic:

1. **Domain Extraction**: Extract the domain from the feedback's `tabUrl`
2. **Project Lookup**: Fetch all projects from the auth server
3. **Domain Matching**: Compare the extracted domain against project domains:
   - `domainLocal` (e.g., `localhost:3301`)
   - `domainDevelopment` (e.g., `dev.example.com`)
   - `domainStaging` (e.g., `stg.example.com`)
   - `domainProduction` (e.g., `example.com`)

### Domain Matching Rules

- **Exact Match**: `example.com` matches `example.com`
- **Subdomain Match**: `dev.example.com` matches `example.com`
- **Localhost Port Match**: `app.localhost:9999` matches `other.localhost:9999`
- **Exact Localhost Match**: `localhost:3000` matches `localhost:3000`

### GitHub Issue Creation

When a project is matched and has a `githubRepository` configured:

1. Parse the GitHub repository URL (supports both SSH and HTTPS formats)
2. Create an issue with:
   - **Title**: `[フィードバック] {Page Title}`
   - **Body**: Formatted with feedback details, screenshot, and metadata
   - **Labels**: `feedback`, `user-report`

## Example GitHub Issue

```markdown
## フィードバック詳細

**コメント:**
This is a test feedback comment

**ページ情報:**
- URL: https://example.com/test-page
- タイトル: Test Page Title
- 受信日時: 2024/01/01 09:00:00

**スクリーンショット:**
![Screenshot](https://example.com/screenshot.png)

**技術情報:**
- フィードバックID: 123
- User Agent: Mozilla/5.0 (Test Browser)

---
*このissueは自動的にフィードバックシステムから作成されました*
```

## Supported Repository Formats

The system supports both SSH and HTTPS GitHub repository URLs:

- SSH: `git@github.com:owner/repo.git`
- SSH (no .git): `git@github.com:owner/repo`
- HTTPS: `https://github.com/owner/repo.git`
- HTTPS (no .git): `https://github.com/owner/repo`

## Error Handling

The system handles errors gracefully:

- **No Project Match**: Logs a warning but continues processing
- **Invalid GitHub URL**: Logs an error but continues processing
- **GitHub API Error**: Logs the error but doesn't affect feedback storage
- **Auth Server Error**: Logs the error but doesn't affect feedback storage

All errors are logged to the console for debugging purposes.

## Testing

Run the tests to verify the integration:

```bash
npm test -- --testPathPatterns="github|projects"
```

This will run tests for:
- GitHub URL parsing
- GitHub issue data creation
- Domain extraction and matching
- Project lookup logic

## Troubleshooting

### Common Issues

1. **GitHub API Rate Limits**: Ensure your GitHub token has sufficient rate limits
2. **Invalid Repository URL**: Check that the project's `githubRepository` field is correctly formatted
3. **Authentication Issues**: Verify that both GitHub and auth server tokens are valid
4. **Domain Matching**: Check that project domains are correctly configured

### Debug Logging

The system provides detailed logging:

```javascript
// Example log outputs
console.log('GitHub issue作成を開始: フィードバックID 123, URL: https://example.com/page');
console.log('プロジェクトを発見: example-app (Example App) - git@github.com:owner/repo');
console.log('GitHub issue作成成功: フィードバックID 123, Issue URL: https://github.com/owner/repo/issues/456');
```

## Integration Flow

```
Extension Feedback → Feedback API → Project Matching → GitHub Issue Creation
                                          ↓
                                  Auth Server Projects API
```

1. User submits feedback through Chrome extension
2. Feedback is stored in the database
3. System extracts domain from feedback URL
4. System fetches projects from auth server
5. System matches domain to project
6. If match found and GitHub repo configured, create GitHub issue
7. Process completes (success/failure doesn't affect main flow) 