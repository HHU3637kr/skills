/**
 * 状态管理模块
 *
 * 根据 plan.md: spec/03-功能实现/20260115-1617-Obsidian插件-Spec确认工作流/plan.md
 * 章节: 设计方案 - 数据结构
 */

// 文档类型
export type DocType = 'plan' | 'update' | 'summary' | 'review';

// 文档状态
export type DocStatus = '未确认' | '已确认' | '已归档';

// 确认动作
export type ConfirmAction = 'continue' | 'modify' | 'retry';

/**
 * 文档信息接口
 */
export interface DocInfo {
    filePath: string;        // 文档路径，如 "spec/03-功能实现/xxx/plan.md"
    docType: DocType;        // 文档类型
    title: string;           // 文档标题
    status: DocStatus;       // 当前状态
}

/**
 * 确认请求
 */
export interface ConfirmRequest {
    filePath: string;        // 文档路径
    docType: DocType;        // 文档类型
    title: string;           // 文档标题
    timestamp: number;       // 请求时间戳
}

/**
 * 确认响应
 */
export interface ConfirmResponse {
    action: ConfirmAction;
    userMessage?: string;    // 用户可选填写的反馈
    newStatus: DocStatus;    // 更新后的状态
}

/**
 * 服务器状态
 */
export interface ServerStatus {
    port: number;            // 服务器端口
    running: boolean;        // 服务器是否运行
    waiting: boolean;        // 是否等待用户确认
    currentDoc: DocInfo | null;  // 当前等待确认的文档
}

/**
 * 状态变化回调类型
 */
export type StatusChangeCallback = (status: ServerStatus) => void;

/**
 * 状态管理器类
 *
 * 负责管理当前等待确认的状态、文档信息和回调函数
 */
export class StatusManager {
    private _port: number;
    private _running: boolean = false;
    private _waiting: boolean = false;
    private _currentDoc: DocInfo | null = null;
    private _pendingResolve: ((response: ConfirmResponse) => void) | null = null;
    private _statusCallbacks: StatusChangeCallback[] = [];

    constructor(port: number) {
        this._port = port;
    }

    /**
     * 获取当前状态
     */
    getStatus(): ServerStatus {
        return {
            port: this._port,
            running: this._running,
            waiting: this._waiting,
            currentDoc: this._currentDoc,
        };
    }

    /**
     * 设置服务器运行状态
     */
    setRunning(running: boolean): void {
        this._running = running;
        this._notifyStatusChange();
    }

    /**
     * 设置服务器端口
     */
    setPort(port: number): void {
        this._port = port;
        this._notifyStatusChange();
    }

    /**
     * 开始等待确认
     *
     * @param doc 等待确认的文档信息
     * @returns Promise<ConfirmResponse> 用户确认后的响应
     */
    startWaiting(doc: DocInfo): Promise<ConfirmResponse> {
        this._waiting = true;
        this._currentDoc = doc;
        this._notifyStatusChange();

        return new Promise<ConfirmResponse>((resolve) => {
            this._pendingResolve = resolve;
        });
    }

    /**
     * 处理用户确认
     *
     * @param action 用户确认动作
     * @param userMessage 用户可选的消息
     */
    handleConfirm(action: ConfirmAction, userMessage?: string): void {
        if (this._pendingResolve) {
            const newStatus: DocStatus = action === 'continue' ? '已确认' : '未确认';
            const response: ConfirmResponse = {
                action,
                userMessage,
                newStatus,
            };

            this._pendingResolve(response);
            this._pendingResolve = null;
            this._waiting = false;
            this._currentDoc = null;
            this._notifyStatusChange();
        }
    }

    /**
     * 取消等待（用于超时或错误处理）
     */
    cancelWaiting(): void {
        if (this._pendingResolve) {
            this._pendingResolve({
                action: 'retry',
                newStatus: '未确认',
            });
            this._pendingResolve = null;
            this._waiting = false;
            this._currentDoc = null;
            this._notifyStatusChange();
        }
    }

    /**
     * 注册状态变化回调
     *
     * @param callback 状态变化时的回调函数
     */
    onStatusChange(callback: StatusChangeCallback): void {
        this._statusCallbacks.push(callback);
    }

    /**
     * 通知所有状态变化回调
     */
    private _notifyStatusChange(): void {
        const status = this.getStatus();
        this._statusCallbacks.forEach(callback => callback(status));
    }

    /**
     * 清理资源
     */
    dispose(): void {
        this.cancelWaiting();
        this._statusCallbacks = [];
    }
}

export default StatusManager;
