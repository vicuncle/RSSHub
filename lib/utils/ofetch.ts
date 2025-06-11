import { createFetch } from 'ofetch';
import { config } from '@/config';
import logger from '@/utils/logger';

// Only attempt to use node-network-devtools in development mode
// This code will be eliminated during production builds
const loadDevTools = () => {
    if (typeof window === 'undefined' && 
        typeof process !== 'undefined' && 
        process.env && 
        config.enableRemoteDebugging && 
        process.env.NODE_ENV === 'dev') {
        // We're in Node.js and in development mode
        import('node-network-devtools')
            .then((module) => {
                if (module && module.register) {
                    module.register();
                }
            })
            .catch((error) => {
                // Silently fail if the module is not available in production
                logger.debug('node-network-devtools not available, skipping registration');
            });
    }
};

// Only call this function in development
if (process.env.NODE_ENV !== 'production') {
    loadDevTools();
}

const rofetch = createFetch().create({
    retryStatusCodes: [400, 408, 409, 425, 429, 500, 502, 503, 504],
    retry: config.requestRetry,
    retryDelay: 1000,
    // timeout: config.requestTimeout,
    onResponseError({ request, response, options }) {
        if (options.retry) {
            logger.warn(`Request ${request} with error ${response.status} remaining retry attempts: ${options.retry}`);
            if (!options.headers) {
                options.headers = new Headers();
            }
            if (options.headers instanceof Headers) {
                options.headers.set('x-prefer-proxy', '1');
            } else {
                (options.headers as Record<string, string>)['x-prefer-proxy'] = '1';
            }
        }
    },
    onRequestError({ request, error }) {
        logger.error(`Request ${request} fail: ${error}`);
    },
    headers: {
        'user-agent': config.ua,
    },
    onResponse({ request, response }) {
        if (response.redirected) {
            logger.http(`Redirecting to ${response.url} for ${request}`);
        }
    },
});

export default rofetch;
