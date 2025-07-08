import { extractDomainFromUrl, isDomainMatch } from '@/lib/projects';

describe('Projects Integration', () => {
    describe('extractDomainFromUrl', () => {
        it('should extract domain from HTTPS URL', () => {
            const url = 'https://example.com/path/to/page';
            const result = extractDomainFromUrl(url);

            expect(result).toBe('example.com');
        });

        it('should extract domain from HTTP URL', () => {
            const url = 'http://example.com/path/to/page';
            const result = extractDomainFromUrl(url);

            expect(result).toBe('example.com');
        });

        it('should extract domain with port', () => {
            const url = 'http://localhost:3000/path/to/page';
            const result = extractDomainFromUrl(url);

            expect(result).toBe('localhost:3000');
        });

        it('should extract subdomain', () => {
            const url = 'https://sub.example.com/path/to/page';
            const result = extractDomainFromUrl(url);

            expect(result).toBe('sub.example.com');
        });

        it('should return empty string for invalid URL', () => {
            const url = 'invalid-url';
            const result = extractDomainFromUrl(url);

            expect(result).toBe('');
        });

        it('should handle localhost with port and subdomain', () => {
            const url = 'http://poly-ide.localhost:9999/path/to/page';
            const result = extractDomainFromUrl(url);

            expect(result).toBe('poly-ide.localhost:9999');
        });
    });

    describe('isDomainMatch', () => {
        it('should match exact domains', () => {
            const result = isDomainMatch('example.com', 'example.com');
            expect(result).toBe(true);
        });

        it('should match exact localhost with port', () => {
            const result = isDomainMatch('localhost:3000', 'localhost:3000');
            expect(result).toBe(true);
        });

        it('should not match different ports', () => {
            const result = isDomainMatch('localhost:3000', 'localhost:3001');
            expect(result).toBe(false);
        });

        it('should match subdomain localhost with same port', () => {
            const result = isDomainMatch('app.localhost:9999', 'other.localhost:9999');
            expect(result).toBe(true);
        });

        it('should not match subdomain localhost with different port', () => {
            const result = isDomainMatch('app.localhost:9999', 'other.localhost:8888');
            expect(result).toBe(false);
        });

        it('should match subdomain patterns', () => {
            const result = isDomainMatch('dev.example.com', 'example.com');
            expect(result).toBe(true);
        });

        it('should match reverse subdomain patterns', () => {
            const result = isDomainMatch('example.com', 'dev.example.com');
            expect(result).toBe(true);
        });

        it('should not match completely different domains', () => {
            const result = isDomainMatch('example.com', 'different.com');
            expect(result).toBe(false);
        });

        it('should match real project domains', () => {
            // Test with actual project domains from the API response
            const urlDomain = 'poly-ide.localhost:9999';
            const projectDomain = 'poly-ide.localhost:9999';

            const result = isDomainMatch(urlDomain, projectDomain);
            expect(result).toBe(true);
        });

        it('should match development domain patterns', () => {
            const urlDomain = 'dev.poly-ide.apptest.jp';
            const projectDomain = 'dev.poly-ide.apptest.jp';

            const result = isDomainMatch(urlDomain, projectDomain);
            expect(result).toBe(true);
        });

        it('should match staging domain patterns', () => {
            const urlDomain = 'stg.simple-nextjs-example2.apptest.jp';
            const projectDomain = 'stg.simple-nextjs-example2.apptest.jp';

            const result = isDomainMatch(urlDomain, projectDomain);
            expect(result).toBe(true);
        });

        it('should match production domain patterns', () => {
            const urlDomain = 'simple-nextjs-example2.apptest.jp';
            const projectDomain = 'simple-nextjs-example2.apptest.jp';

            const result = isDomainMatch(urlDomain, projectDomain);
            expect(result).toBe(true);
        });

        it('should handle localhost without port', () => {
            const urlDomain = 'localhost';
            const projectDomain = 'localhost';

            const result = isDomainMatch(urlDomain, projectDomain);
            expect(result).toBe(true);
        });
    });
}); 