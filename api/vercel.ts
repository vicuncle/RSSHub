import app from '../dist/lib/app';

// 处理所有请求
export default async function handler(req, res) {
    try {
        // 移除 /api/vercel 前缀
        const url = new URL(req.url, `http://${req.headers.host}`);
        url.pathname = url.pathname.replace(/^\/api\/vercel/, '');
        
        // 如果是根路径且没有其他路径，则保持原样
        if (url.pathname === '') {
            url.pathname = '/';
        }
        
        // 创建新的请求对象
        const newReq = new Request(url, {
            method: req.method,
            headers: req.headers,
            body: req.method !== 'GET' && req.method !== 'HEAD' ? req.body : undefined
        });
        
        // 使用 app.fetch 处理请求
        const response = await app.fetch(newReq);
        
        // 设置响应头
        for (const [key, value] of response.headers) {
            res.setHeader(key, value);
        }
        
        // 设置状态码
        res.status(response.status);
        
        // 发送响应体
        const body = await response.text();
        res.send(body);
    } catch (error) {
        console.error('Error handling request:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}
