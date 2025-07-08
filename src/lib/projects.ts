export interface Project {
    id: number;
    name: string;
    displayName: string;
    description: string;
    domainLocal: string;
    domainDevelopment: string;
    domainStaging: string;
    domainProduction: string;
    framework: string | null;
    githubRepository: string | null;
    localFolderStatus: string;
    allowRegistration: boolean;
    createdAt: string;
    updatedAt: string;
    _count: {
        users: number;
        apiKeys: number;
    };
}

export interface ProjectsApiResponse {
    data: Project[];
    meta: {
        total: number;
        authenticatedAs: {
            applicationId: number;
            applicationName: string;
        };
        requestedAt: string;
    };
}

/**
 * 認証サーバーからプロジェクト一覧を取得
 */
export async function fetchProjects(): Promise<Project[]> {
    try {
        const authServerUrl = process.env.AUTH_SERVER_URL;
        const authToken = process.env.AUTH_SERVER_TOKEN;

        if (!authServerUrl || !authToken) {
            throw new Error('AUTH_SERVER_URL and AUTH_SERVER_TOKEN environment variables are required');
        }

        const response = await fetch(`${authServerUrl}/api/projects`, {
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch projects: ${response.status} ${response.statusText}`);
        }

        const data: ProjectsApiResponse = await response.json();
        console.log(`Fetched ${data.data.length} projects from auth server`);

        return data.data;
    } catch (error) {
        console.error('Error fetching projects:', error);
        throw error;
    }
}

/**
 * URLからドメインを抽出
 */
export function extractDomainFromUrl(url: string): string {
    try {
        const urlObj = new URL(url);
        return urlObj.host; // host includes port if present
    } catch (error) {
        console.error('Invalid URL:', url);
        return '';
    }
}

/**
 * ドメインがプロジェクトドメインにマッチするかチェック
 */
export function isDomainMatch(urlDomain: string, projectDomain: string): boolean {
    // 完全一致
    if (urlDomain === projectDomain) {
        return true;
    }

    // localhost関連の処理
    if (urlDomain.includes('localhost') && projectDomain.includes('localhost')) {
        // サブドメインマッチ（開発環境用）
        // example.localhost:9999 vs poly-ide.localhost:9999
        const urlParts = urlDomain.split('.');
        const projectParts = projectDomain.split('.');

        // 両方ともサブドメイン付きlocalhost（subdomain.localhost:port）
        if (urlParts.length >= 2 && projectParts.length >= 2) {
            const urlPort = urlParts[urlParts.length - 1]; // localhost:9999 -> 9999
            const projectPort = projectParts[projectParts.length - 1];
            
            // ポート番号が同じかチェック
            if (urlPort === projectPort) {
                return true;
            }
        }
        
        // 直接のlocalhost:port vs localhost:port
        return urlDomain === projectDomain;
    }

    // 通常のドメインマッチ
    // dev.example.com vs example.com など
    if (urlDomain.endsWith(`.${projectDomain}`) || projectDomain.endsWith(`.${urlDomain}`)) {
        return true;
    }

    return false;
}

/**
 * URLからプロジェクトを検索
 */
export async function findProjectByUrl(url: string): Promise<Project | null> {
    try {
        const projects = await fetchProjects();
        const urlDomain = extractDomainFromUrl(url);

        if (!urlDomain) {
            console.warn('Could not extract domain from URL:', url);
            return null;
        }

        console.log(`Searching for project matching domain: ${urlDomain}`);

        // 各プロジェクトの全ドメインと照合
        for (const project of projects) {
            const domains = [
                project.domainLocal,
                project.domainDevelopment,
                project.domainStaging,
                project.domainProduction,
            ].filter(Boolean); // null/undefined を除外

            for (const domain of domains) {
                if (isDomainMatch(urlDomain, domain)) {
                    console.log(`Found matching project: ${project.name} (${project.displayName}) for domain ${urlDomain}`);
                    return project;
                }
            }
        }

        console.warn(`No project found for domain: ${urlDomain}`);
        return null;
    } catch (error) {
        console.error('Error finding project by URL:', error);
        return null;
    }
} 