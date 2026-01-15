/**
 * MCP Server 实现
 *
 * 根据 plan.md: spec/03-功能实现/20260115-1617-Obsidian插件-Spec确认工作流/plan.md
 * 章节: 实现步骤 - 步骤 2: MCP Server 实现
 *
 * 参考 Wind-EX 插件的 embedded-mcp-server.js 实现
 */

import { createServer, IncomingMessage, ServerResponse, Server } from 'http';
import { WebSocketServer, WebSocket as WebSocketNode } from 'ws';
import { StatusManager, DocInfo, ConfirmRequest, ConfirmResponse } from './status-manager.js';
import { registerMCPTools } from './mcp-tools.js';

/**
 * MCP Server 类
 *
 * 内置 HTTP Server + WebSocket Server，实现 MCP 协议
 */
export class MCPServer {
    private _server: Server | null = null;
    private _wss: WebSocketServer | null = null;
    private _wsClients: Set<WebSocketNode> = new Set();
    private _statusManager: StatusManager;
    private _startPort: number;
    private _currentPort: number;

    constructor(startPort: number, statusManager: StatusManager) {
        this._startPort = startPort;
        this._currentPort = startPort;
        this._statusManager = statusManager;
    }

    /**
     * 获取当前端口
     */
    get port(): number {
        return this._currentPort;
    }

    /**
     * 获取服务器运行状态
     */
    get isRunning(): boolean {
        return this._server !== null;
    }

    /**
     * 启动 MCP Server
     *
     * @returns Promise<boolean> 启动是否成功
     */
    async start(): Promise<boolean> {
        if (this._server) {
            console.log('[SpecConfirm MCP] Server already running');
            return true;
        }

        return new Promise<boolean>((resolve: (value: boolean) => void) => {
            this._createServer(this._currentPort)
                .then(() => {
                    console.log(`[SpecConfirm MCP] Server started on port ${this._currentPort}`);
                    this._statusManager.setPort(this._currentPort);
                    this._statusManager.setRunning(true);
                    this._setupWebSocket();
                    resolve(true);
                })
                .catch((error: NodeJS.ErrnoException) => {
                    if (error.code === 'EADDRINUSE') {
                        console.log(`[SpecConfirm MCP] Port ${this._currentPort} is in use, trying next...`);
                        this._currentPort++;
                        // 最多尝试 100 个端口
                        if (this._currentPort - this._startPort < 100) {
                            this.start().then(resolve);
                        } else {
                            console.error('[SpecConfirm MCP] No available ports');
                            resolve(false);
                        }
                    } else {
                        console.error('[SpecConfirm MCP] Failed to start server:', error);
                        resolve(false);
                    }
                });
        });
    }

    /**
     * 停止 MCP Server
     */
    async stop(): Promise<void> {
        // 关闭所有 WebSocket 连接
        this._wsClients.forEach((client: WebSocketNode) => {
            if (client.readyState === WebSocketNode.OPEN) {
                client.close();
            }
        });
        this._wsClients.clear();

        // 关闭 WebSocket Server
        if (this._wss) {
            this._wss.close();
            this._wss = null;
        }

        // 关闭 HTTP Server
        if (this._server) {
            return new Promise<void>((resolve) => {
                this._server!.close(() => {
                    console.log('[SpecConfirm MCP] Server stopped');
                    this._server = null;
                    this._statusManager.setRunning(false);
                    resolve();
                });
            });
        }
    }

    /**
     * 创建 HTTP Server
     */
    private async _createServer(port: number): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            this._server = createServer((req, res) => {
                this._handleRequest(req, res);
            });

            this._server.on('error', reject);

            this._server.listen(port, () => {
                resolve();
            });
        });
    }

    /**
     * 设置 WebSocket Server
     */
    private _setupWebSocket(): void {
        if (!this._server) return;

        this._wss = new WebSocketServer({ server: this._server });

        this._wss.on('connection', (ws: WebSocketNode) => {
            console.log('[SpecConfirm MCP] WebSocket client connected');
            this._wsClients.add(ws);

            // 发送当前状态
            const status = this._statusManager.getStatus();
            if (ws.readyState === WebSocketNode.OPEN) {
                ws.send(JSON.stringify(status));
            }

            ws.on('close', () => {
                console.log('[SpecConfirm MCP] WebSocket client disconnected');
                this._wsClients.delete(ws);
            });

            ws.on('error', (error: Error) => {
                console.error('[SpecConfirm MCP] WebSocket error:', error);
                this._wsClients.delete(ws);
            });
        });

        console.log(`[SpecConfirm MCP] WebSocket server listening on port ${this._currentPort}`);
    }

    /**
     * 广播状态到所有 WebSocket 客户端
     */
    broadcastStatus(): void {
        const status = this._statusManager.getStatus();
        const message = JSON.stringify(status);

        this._wsClients.forEach((client: WebSocketNode) => {
            if (client.readyState === WebSocketNode.OPEN) {
                client.send(message);
            }
        });
    }

    /**
     * 处理 HTTP 请求
     */
    private async _handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
        // 设置 CORS 头
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
            res.writeHead(200);
            res.end();
            return;
        }

        const url = new URL(req.url || '/', `http://localhost:${this._currentPort}`);

        // 健康检查
        if (req.method === 'GET' && url.pathname === '/health') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                status: 'ok',
                port: this._currentPort,
                running: true,
            }));
            return;
        }

        // 状态查询
        if (req.method === 'GET' && url.pathname === '/status') {
            const status = this._statusManager.getStatus();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(status));
            return;
        }

        // 用户响应端点
        if (req.method === 'POST' && url.pathname === '/user/response') {
            this._handleUserResponse(req, res);
            return;
        }

        // MCP 协议端点
        if (req.method === 'POST' && (url.pathname === '/mcp' || url.pathname === '/')) {
            this._handleMCPRequest(req, res);
            return;
        }

        // 404
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not found' }));
    }

    /**
     * 处理用户响应
     */
    private async _handleUserResponse(req: IncomingMessage, res: ServerResponse): Promise<void> {
        let body = '';

        req.on('data', (chunk) => {
            body += chunk.toString();
        });

        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const { action, userMessage } = data;

                console.log(`[SpecConfirm MCP] User response: action=${action}`);

                // 通知状态管理器
                this._statusManager.handleConfirm(action, userMessage);

                // 广播状态更新
                this.broadcastStatus();

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true }));
            } catch (error) {
                console.error('[SpecConfirm MCP] Failed to handle user response:', error);
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Invalid request' }));
            }
        });
    }

    /**
     * 处理 MCP 协议请求
     */
    private async _handleMCPRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
        let body = '';

        req.on('data', (chunk) => {
            body += chunk.toString();
        });

        req.on('end', async () => {
            try {
                const request = JSON.parse(body);
                const { method, params, id } = request;

                console.log(`[SpecConfirm MCP] MCP request: method=${method}`);

                let result: any;

                switch (method) {
                    case 'initialize':
                        result = {
                            protocolVersion: '2024-11-05',
                            capabilities: {
                                tools: {}
                            },
                            serverInfo: {
                                name: 'obsidian-spec-confirm',
                                version: '1.0.0'
                            }
                        };
                        break;

                    case 'tools/list':
                        result = {
                            tools: [
                                {
                                    name: 'spec_confirm',
                                    description: '等待用户确认 Spec 文档。用户在 Obsidian 中审阅后点击确认按钮才会返回。',
                                    inputSchema: {
                                        type: 'object',
                                        properties: {
                                            file_path: {
                                                type: 'string',
                                                description: 'Spec 文档的相对路径，如 spec/03-功能实现/xxx/plan.md'
                                            },
                                            doc_type: {
                                                type: 'string',
                                                enum: ['plan', 'update', 'summary', 'review'],
                                                description: '文档类型'
                                            },
                                            title: {
                                                type: 'string',
                                                description: '文档标题，用于显示给用户'
                                            }
                                        },
                                        required: ['file_path', 'doc_type']
                                    }
                                },
                                {
                                    name: 'get_status',
                                    description: '获取当前 MCP Server 状态，包括是否正在等待确认',
                                    inputSchema: {
                                        type: 'object',
                                        properties: {}
                                    }
                                }
                            ]
                        };
                        break;

                    case 'tools/call':
                        result = await this._handleToolCall(params);
                        break;

                    case 'notifications/initialized':
                        // 客户端初始化完成通知，无需返回
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end();
                        return;

                    default:
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({
                            jsonrpc: '2.0',
                            error: {
                                code: -32601,
                                message: `Method not found: ${method}`
                            },
                            id
                        }));
                        return;
                }

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    jsonrpc: '2.0',
                    result,
                    id
                }));
            } catch (error) {
                console.error('[SpecConfirm MCP] Failed to handle MCP request:', error);
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    jsonrpc: '2.0',
                    error: {
                        code: -32700,
                        message: 'Parse error'
                    },
                    id: null
                }));
            }
        });
    }

    /**
     * 处理 MCP 工具调用
     */
    private async _handleToolCall(params: any): Promise<any> {
        const { name, arguments: args } = params;

        console.log(`[SpecConfirm MCP] Tool call: ${name}`, args);

        if (name === 'spec_confirm') {
            const { file_path, doc_type, title } = args;

            // 创建文档信息
            const docInfo: DocInfo = {
                filePath: file_path,
                docType: doc_type,
                title: title || file_path.split('/').pop() || 'Unknown',
                status: '未确认'
            };

            // 开始等待用户确认
            const response = await this._statusManager.startWaiting(docInfo);

            // 广播状态更新
            this.broadcastStatus();

            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            action: response.action,
                            newStatus: response.newStatus,
                            userMessage: response.userMessage
                        })
                    }
                ]
            };
        }

        if (name === 'get_status') {
            const status = this._statusManager.getStatus();
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(status)
                    }
                ]
            };
        }

        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({ error: `Unknown tool: ${name}` })
                }
            ],
            isError: true
        };
    }
}
