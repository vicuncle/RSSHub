import app from '../lib/app';

export const config = {
    runtime: 'edge',
};

// 处理所有请求
export default async function handler(req) {
    // 移除 /api/vercel.ts 前缀
    const url = new URL(req.url);
    url.pathname = url.pathname.replace(/^\/api\/vercel\.ts/, '');
    
    // 如果是根路径且没有其他路径，则保持原样
    if (url.pathname === '') {
        url.pathname = '/';
    }
    
    // 创建新的请求对象
    const newReq = new Request(url, req);
    
    // 使用 app.fetch 处理请求
    return app.fetch(newReq);
}
