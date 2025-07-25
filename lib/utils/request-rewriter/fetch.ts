import logger from '@/utils/logger';
import { config } from '@/config';
import undici, { Request, RequestInfo, RequestInit } from 'undici';
import proxy from '@/utils/proxy';
import { RateLimiterMemory, RateLimiterQueue } from 'rate-limiter-flexible';
// node-network-devtools is only used in development mode

const limiter = new RateLimiterMemory({
    points: 10,
    duration: 1,
    execEvenly: true,
});

const limiterQueue = new RateLimiterQueue(limiter, {
    maxQueueSize: 4800,
});

export const useCustomHeader = (headers: Headers) => {
    // This function will be tree-shaken in production builds
    if (process.env.NODE_ENV === 'dev') {
        // Only in development mode, try to load the module
        // @ts-ignore - Dynamic import
        import('node-network-devtools')
            .then((module) => {
                if (module && module.useRegisterRequest) {
                    module.useRegisterRequest((req: any) => {
                        for (const [key, value] of headers.entries()) {
                            req.requestHeaders[key] = value;
                        }
                        return req;
                    });
                }
            })
            .catch(() => {
                // Silently fail if the module is not available
            });
    }
};

const wrappedFetch: typeof undici.fetch = async (input: RequestInfo, init?: RequestInit) => {
    const request = new Request(input, init);
    const options: RequestInit = {};

    logger.debug(`Outgoing request: ${request.method} ${request.url}`);

    // ua
    if (!request.headers.get('user-agent')) {
        request.headers.set('user-agent', config.ua);
    }

    // accept
    if (!request.headers.get('accept')) {
        request.headers.set('accept', '*/*');
    }

    // referer
    if (!request.headers.get('referer')) {
        try {
            const urlHandler = new URL(request.url);
            request.headers.set('referer', urlHandler.origin);
        } catch {
            // ignore
        }
    }

    let isRetry = false;
    if (request.headers.get('x-prefer-proxy')) {
        isRetry = true;
        request.headers.delete('x-prefer-proxy');
    }

    config.enableRemoteDebugging && useCustomHeader(request.headers);

    // proxy
    if (!init?.dispatcher && proxy.dispatcher && (proxy.proxyObj.strategy !== 'on_retry' || isRetry)) {
        const proxyRegex = new RegExp(proxy.proxyObj.url_regex);
        let urlHandler;
        try {
            urlHandler = new URL(request.url);
        } catch {
            // ignore
        }

        if (proxyRegex.test(request.url) && request.url.startsWith('http') && !(urlHandler && urlHandler.host === proxy.proxyUrlHandler?.host)) {
            options.dispatcher = proxy.dispatcher;
            logger.debug(`Proxying request: ${request.url}`);
        }
    }

    await limiterQueue.removeTokens(1);
    return undici.fetch(request, options);
};

export default wrappedFetch;
