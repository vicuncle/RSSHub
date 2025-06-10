import { Hono } from 'hono';

import { compress } from 'hono/compress';
import mLogger from '@/middleware/logger';
import cache from '@/middleware/cache';
import template from '@/middleware/template';
import sentry from '@/middleware/sentry';
import accessControl from '@/middleware/access-control';
import debug from '@/middleware/debug';
import header from '@/middleware/header';
import antiHotlink from '@/middleware/anti-hotlink';
import parameter from '@/middleware/parameter';
import trace from '@/middleware/trace';
import { jsxRenderer } from 'hono/jsx-renderer';
import { trimTrailingSlash } from 'hono/trailing-slash';

import logger from '@/utils/logger';

import { notFoundHandler, errorHandler } from '@/errors';
import registry from '@/registry';
import api from '@/api';

// 处理未捕获的异常
process.on('uncaughtException', (e) => {
    logger.error('uncaughtException:', e);
    // 记录更详细的错误信息
    if (e.stack) {
        logger.error('Stack trace:', e.stack);
    }
});

// 处理未处理的 Promise 拒绝
process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

const app = new Hono();

// 基础中间件
app.use(trimTrailingSlash());
app.use(compress());

// 添加全局错误处理中间件
app.use('*', async (c, next) => {
    try {
        await next();
    } catch (err) {
        logger.error('Global middleware error:', err);
        if (err instanceof Error) {
            logger.error('Error details:', {
                name: err.name,
                message: err.message,
                stack: err.stack,
            });
        }
        throw err;
    }
});

app.use(
    jsxRenderer(({ children }) => <>{children}</>, {
        docType: '<?xml version="1.0" encoding="UTF-8"?>',
        stream: {},
    })
);

// 功能中间件
app.use(mLogger);
app.use(trace);
app.use(sentry);
app.use(accessControl);
app.use(debug);
app.use(template);
app.use(header);
app.use(antiHotlink);
app.use(parameter);
app.use(cache);

// 路由
app.route('/', registry);
app.route('/api', api);

// 错误处理
app.notFound(notFoundHandler);
app.onError(errorHandler);

export default app;
