/**
 * 侧边栏面板组件
 *
 * 根据 update-001: spec/03-功能实现/20260115-1617-Obsidian插件-Spec确认工作流/update-001-侧边栏面板.md
 * 章节: 实现步骤 - 步骤 1: 创建侧边栏组件
 */

import { WorkspaceLeaf, ItemView, Notice } from 'obsidian';
import { DocInfo, ConfirmAction } from './status-manager.js';
import { findSpecFile, openDoc } from './utils.js';

/**
 * 侧边栏视图类型
 */
export const VIEW_TYPE_SPEC_CONFIRM = 'spec-confirm-view';

/**
 * Spec 确认侧边栏
 *
 * 显示等待确认的文档，提供内联确认按钮
 */
export class SpecConfirmSidebar extends ItemView {
    private _currentDoc: DocInfo | null = null;
    private _onConfirmCallback: ((action: ConfirmAction, userMessage?: string) => void) | null = null;

    /**
     * 获取视图类型
     */
    getViewType(): string {
        return VIEW_TYPE_SPEC_CONFIRM;
    }

    /**
     * 获取显示文本
     */
    getDisplayText(): string {
        return 'Spec 确认';
    }

    /**
     * 获取图标
     */
    getIcon(): string {
        return 'check-circle';
    }

    /**
     * 视图打开时调用
     */
    async onOpen(): Promise<void> {
        const { containerEl } = this;
        containerEl.empty();
        containerEl.addClass('spec-confirm-sidebar');

        // 渲染初始内容
        this._renderEmptyState();
    }

    /**
     * 视图关闭时调用
     */
    async onClose(): Promise<void> {
        // 清理资源
        this._currentDoc = null;
        this._onConfirmCallback = null;
    }

    /**
     * 更新状态（由 StatusManager 调用）
     *
     * @param doc 当前等待确认的文档，null 表示无等待
     * @param onConfirm 确认回调函数
     */
    updateStatus(doc: DocInfo | null, onConfirm: (action: ConfirmAction, userMessage?: string) => void): void {
        this._currentDoc = doc;
        this._onConfirmCallback = onConfirm;
        this._render();
    }

    /**
     * 渲染内容
     */
    private _render(): void {
        const { containerEl } = this;
        containerEl.empty();

        if (!this._currentDoc) {
            this._renderEmptyState();
            return;
        }

        this._renderDocItem(this._currentDoc);
    }

    /**
     * 渲染空状态
     */
    private _renderEmptyState(): void {
        const { containerEl } = this;
        containerEl.empty();

        // 标题
        containerEl.createEl('h2', { text: '🔔 Spec 确认' });
        containerEl.createEl('hr');

        // 空状态提示
        const emptyDiv = containerEl.createDiv();
        emptyDiv.addClass('spec-confirm-empty');
        emptyDiv.innerHTML = `
            <p style="font-size: 2rem; margin-bottom: 0.5rem;">💤</p>
            <p><strong>当前没有等待确认的文档</strong></p>
            <p style="color: var(--text-muted); font-size: 0.9em; margin-top: 1rem;">
                当 Claude Code 请求确认时，文档会显示在这里。
            </p>
        `;
    }

    /**
     * 渲染文档项
     */
    private _renderDocItem(doc: DocInfo): void {
        const { containerEl } = this;

        // 标题
        containerEl.createEl('h2', { text: '🔔 Spec 确认' });
        containerEl.createEl('hr');

        // 状态指示
        const statusDiv = containerEl.createDiv();
        statusDiv.addClass('spec-confirm-status');
        statusDiv.innerHTML = '<span class="spec-confirm-pulse">⏳</span> <span>等待确认</span>';

        // 文档卡片
        const cardDiv = containerEl.createDiv();
        cardDiv.addClass('spec-confirm-doc-card');

        // 文档标题（可点击跳转）
        const titleEl = cardDiv.createEl('h3', { text: doc.title });
        titleEl.addClass('spec-confirm-doc-title');
        titleEl.onclick = () => {
            this._openDoc(doc);
        };

        // 文档信息
        const infoDiv = cardDiv.createDiv();
        infoDiv.addClass('spec-confirm-doc-info');
        infoDiv.createSpan({ text: '类型: ' });
        infoDiv.createEl('strong', { text: doc.docType });
        infoDiv.createSpan({ text: '  |  ' });
        infoDiv.createSpan({ text: '状态: ' });
        infoDiv.createEl('strong', { text: doc.status });

        // 文档路径
        const pathDiv = cardDiv.createDiv();
        pathDiv.addClass('spec-confirm-doc-path');
        pathDiv.textContent = doc.filePath;

        // 反馈输入
        const feedbackDiv = cardDiv.createDiv();
        feedbackDiv.addClass('spec-confirm-feedback');

        const feedbackLabel = feedbackDiv.createEl('label', {
            text: '反馈（可选）',
            attr: { for: 'spec-confirm-feedback-input' }
        });

        const feedbackInput = feedbackDiv.createEl('textarea', {
            attr: {
                id: 'spec-confirm-feedback-input',
                placeholder: '如有需要修改的地方，请简要说明...',
                rows: 3
            }
        });
        feedbackInput.addClass('spec-confirm-feedback-input');

        // 分隔线
        cardDiv.createEl('hr', { cls: 'spec-confirm-divider' });

        // 按钮组
        const buttonGroup = cardDiv.createDiv();
        buttonGroup.addClass('spec-confirm-buttons');

        // 打开文档按钮
        this._createButton(buttonGroup, '📖 打开文档', '', () => {
            this._openDoc(doc);
        });

        // 需要修改按钮
        this._createButton(buttonGroup, '✗ 需要修改', 'warning', () => {
            const message = feedbackInput.value.trim();
            this._handleConfirm('modify', message);
        });

        // 确认按钮
        this._createButton(buttonGroup, '✓ 确认', 'cta', () => {
            const message = feedbackInput.value.trim();
            this._handleConfirm('continue', message);
        });

        // 底部提示
        const tipDiv = containerEl.createDiv();
        tipDiv.addClass('spec-confirm-tip');
        tipDiv.innerHTML = '💡 提示: 先在左侧审阅文档，确认无误后点击"确认"按钮';
    }

    /**
     * 创建按钮
     */
    private _createButton(container: HTMLElement, text: string, mod: string, onClick: () => void): HTMLButtonElement {
        const btn = container.createEl('button', { text });
        btn.addClass('spec-confirm-btn');
        if (mod) {
            btn.addClass(`mod-${mod}`);
        }
        // 使用 addEventListener 而不是 onclick，确保事件正确绑定
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('[SpecConfirmSidebar] Button clicked:', text);
            onClick();
        });
        return btn;
    }

    /**
     * 处理确认
     */
    private _handleConfirm(action: ConfirmAction, userMessage: string): void {
        console.log('[SpecConfirmSidebar] _handleConfirm called:', action, userMessage);
        console.log('[SpecConfirmSidebar] _onConfirmCallback exists:', !!this._onConfirmCallback);

        if (this._onConfirmCallback) {
            this._onConfirmCallback(action, userMessage || undefined);
        } else {
            console.error('[SpecConfirmSidebar] No callback registered!');
        }
    }

    /**
     * 打开文档
     */
    private async _openDoc(doc: DocInfo): Promise<void> {
        const file = findSpecFile(this.app, doc.filePath);
        if (file) {
            await openDoc(this.app, file);
        } else {
            new Notice(`❌ 文档不存在: ${doc.filePath}`, 5000);
        }
    }
}
