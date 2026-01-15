/**
 * MCP 工具注册
 *
 * 根据 plan.md: spec/03-功能实现/20260115-1617-Obsidian插件-Spec确认工作流/plan.md
 * 章节: 实现步骤 - 步骤 3: MCP 工具注册
 */

import { StatusManager, DocInfo, ConfirmRequest, ConfirmResponse } from './status-manager.js';

/**
 * MCP 工具请求处理
 *
 * 注意：由于 Obsidian 环境限制，我们通过 HTTP 端点来模拟 MCP 工具调用
 * 实际的 MCP 协议处理在主插件中进行
 */

export interface MCPToolRequest {
    name: string;
    arguments: Record<string, unknown>;
}

export interface MCPToolResponse {
    content: Array<{
        type: 'text';
        text: string;
    }>;
    isError?: boolean;
}

/**
 * spec_confirm 工具处理函数
 *
 * @param args 工具参数
 * @param statusManager 状态管理器
 * @returns Promise<MCPToolResponse> MCP 工具响应
 */
export async function handleSpecConfirm(
    args: Record<string, unknown>,
    statusManager: StatusManager
): Promise<MCPToolResponse> {
    const { file_path, doc_type, title } = args as {
        file_path: string;
        doc_type: 'plan' | 'update' | 'summary' | 'review';
        title?: string;
    };

    // 验证必需参数
    if (!file_path) {
        return {
            content: [{
                type: 'text',
                text: JSON.stringify({
                    error: 'Missing required parameter: file_path',
                }),
            }],
            isError: true,
        };
    }

    if (!doc_type) {
        return {
            content: [{
                type: 'text',
                text: JSON.stringify({
                    error: 'Missing required parameter: doc_type',
                }),
            }],
            isError: true,
        };
    }

    // 创建文档信息
    const docInfo: DocInfo = {
        filePath: file_path,
        docType: doc_type,
        title: title || file_path.split('/').pop() || file_path,
        status: '未确认',
    };

    console.log(`[SpecConfirm MCP] Waiting for confirmation: ${docInfo.title}`);

    // 等待用户确认
    const response: ConfirmResponse = await statusManager.startWaiting(docInfo);

    console.log(`[SpecConfirm MCP] User confirmed: action=${response.action}`);

    return {
        content: [{
            type: 'text',
            text: JSON.stringify(response),
        }],
    };
}

/**
 * 获取 MCP 工具列表
 */
export function getMCPTools(): Array<{
    name: string;
    description: string;
    inputSchema: Record<string, unknown>;
}> {
    return [
        {
            name: 'spec_confirm',
            description: '等待用户确认 Spec 文档。用户在 Obsidian 中审阅后点击确认按钮才会返回。',
            inputSchema: {
                type: 'object',
                properties: {
                    file_path: {
                        type: 'string',
                        description: 'Spec 文档的相对路径，如 spec/03-功能实现/xxx/plan.md',
                    },
                    doc_type: {
                        type: 'string',
                        enum: ['plan', 'update', 'summary', 'review'],
                        description: '文档类型',
                    },
                    title: {
                        type: 'string',
                        description: '文档标题，用于显示给用户',
                    },
                },
                required: ['file_path', 'doc_type'],
            },
        },
    ];
}

/**
 * 注册 MCP 工具（用于 MCP 协议实现）
 *
 * 注意：此函数在主插件中调用，用于处理来自 MCP 客户端的工具调用请求
 */
export function registerMCPTools(statusManager: StatusManager): void {
    // MCP 工具注册在主插件的 HTTP 请求处理中实现
    // 这里只是定义了工具的处理函数
    console.log('[SpecConfirm MCP] Tools registered');
}

export default {
    handleSpecConfirm,
    getMCPTools,
    registerMCPTools,
};
