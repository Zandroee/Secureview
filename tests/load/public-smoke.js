import http from 'k6/http';
import { check, sleep } from 'k6';

// Defaults to local Laravel. Set BASE_URL explicitly for a staging environment.
// Do not point this script at production without authorization and a maintenance window.
const baseUrl = (__ENV.BASE_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '');

export const options = {
    stages: [
        { duration: '15s', target: 1 },
        { duration: '30s', target: 5 },
        { duration: '15s', target: 0 },
    ],
    thresholds: {
        http_req_failed: ['rate<0.01'],
        http_req_duration: ['p(95)<2000'],
    },
};

export default function () {
    const pages = [
        { path: '/up', label: 'health' },
        { path: '/', label: 'home' },
        { path: '/products', label: 'products' },
        { path: '/packages', label: 'packages' },
        { path: '/services', label: 'services' },
    ];

    for (const page of pages) {
        const response = http.get(baseUrl + page.path, {
            tags: { page: page.label },
            redirects: 3,
        });

        check(response, {
            [page.label + ' returns HTTP 200']: (res) => res.status === 200,
        });
    }

    sleep(1);
}
