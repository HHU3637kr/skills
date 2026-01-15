/**
 * UI 组件模块
 *
 * 根据 plan.md: spec/03-功能实现/20260115-1617-Obsidian插件-Spec确认工作流/plan.md
 * 章节: 实现步骤 - 步骤 5: UI 组件
 */

import { App, Notice, Modal, Setting, TFile } from 'obsidian';
import { DocInfo, ConfirmAction } from './status-manager.js';
import { updateDocStatus, openDoc, findSpecFile } from './utils.js';

/**
 * 状态栏组件
 */
export class SpecStatusBar {
    private _item: HTMLElement;
    private _app: App;
    private _currentDoc: DocInfo | null = null;

    constructor(item: HTMLElement, app: App) {
        this._item = item;
        this._app = app;
        this._item.addClass('spec-confirm-status');
        this.hide();
    }

    /**
     * 更新状态栏显示
     */
    update(doc: DocInfo | null): void {
        this._currentDoc = doc;

        if (doc) {
            this._item.innerHTML = '';
            this._item.createEl('span', { text: '⏳ 等待确认: ' });
            this._item.createEl('strong', { text: doc.title });

            // 添加点击事件：打开文档
            this._item.onclick = async () => {
                const file = findSpecFile(this._app, doc.filePath);
                if (file) {
                    await openDoc(this._app, file);
                }
            };

            this._item.show();
        } else {
            this.hide();
        }
    }

    show(): void {
        this._item.show();
    }

    hide(): void {
        this._item.hide();
        this._item.innerHTML = '';
    }
}

/**
 * 确认模态框
 */
export class SpecConfirmModal extends Modal {
    private _doc: DocInfo;
    private _onSubmit: (action: ConfirmAction, userMessage?: string) => void;

    constructor(app: App, doc: DocInfo, onSubmit: (action: ConfirmAction, userMessage?: string) => void) {
        super(app);
        this._doc = doc;
        this._onSubmit = onSubmit;
    }

    async onOpen(): Promise<void> {
        const { contentEl } = this;

        contentEl.empty();

        contentEl.createEl('h2', { text: '确认 Spec 文档' });

        // 文档信息
        const infoDiv = contentEl.createDiv();
        infoDiv.createEl('p', { text: `文档类型: ${this._doc.docType}` });
        infoDiv.createEl('p', { text: `文档路径: ${this._doc.filePath}` });
        infoDiv.createEl('p', { text: `当前状态: ${this._doc.status}` });

        contentEl.createEl('hr');

        // 用户消息输入（可选）
        let userMessage = '';
        new Setting(contentEl)
            .setName('反馈（可选）')
            .setDesc('如有需要修改的地方，请简要说明')
            .addText((text) =>
                text.onChange((value) => {
                    userMessage = value;
                })
            );

        contentEl.createEl('hr');

        // 按钮组
        const buttonDiv = contentEl.createDiv();
        buttonDiv.style.display = 'flex';
        buttonDiv.style.gap = '1rem';
        buttonDiv.style.justifyContent = 'flex-end';
        buttonDiv.style.marginTop = '1rem';

        // 取消按钮
        new Setting(buttonDiv)
            .addButton((btn) =>
                btn
                    .setButtonText('稍后处理')
                    .onClick(() => {
                        this.close();
                    })
            );

        // 需要修改按钮
        new Setting(buttonDiv)
            .addButton((btn) =>
                btn
                    .setButtonText('✗ 需要修改')
                    .setWarning()
                    .onClick(() => {
                        this._onSubmit('modify', userMessage || '需要修改');
                        this.close();
                    })
            );

        // 确认按钮
        new Setting(buttonDiv)
            .addButton((btn) =>
                btn
                    .setButtonText('✓ 确认')
                    .setCta()
                    .onClick(() => {
                        this._onSubmit('continue', userMessage);
                        this.close();
                    })
            );
    }

    async onClose(): Promise<void> {
        const { contentEl } = this;
        contentEl.empty();
    }
}

/**
 * 通知管理器
 */
export class SpecNotifier {
    private _app: App;
    private _currentNotice: Notice | null = null;

    constructor(app: App) {
        this._app = app;
    }

    /**
     * 显示确认通知
     */
    showConfirmNotice(doc: DocInfo, onConfirm: (action: ConfirmAction, userMessage?: string) => void): void {
        // 关闭之前的通知
        if (this._currentNotice) {
            // Notice 无法手动关闭，创建新的会替换旧的
        }

        const notice = new Notice(
            `⏳ 等待确认: ${doc.title}`,
            0 // 不自动隐藏
        );

        this._currentNotice = notice;

        // 添加点击事件（通过修改 DOM）
        setTimeout(() => {
            const noticeEl = notice.noticeEl;
            if (noticeEl) {
                noticeEl.style.cursor = 'pointer';
                noticeEl.onclick = () => {
                    new SpecConfirmModal(this._app, doc, onConfirm).open();
                };
            }
        }, 100);
    }

    /**
     * 显示确认模态框
     */
    showConfirmModal(doc: DocInfo, onConfirm: (action: ConfirmAction, userMessage?: string) => void): void {
        new SpecConfirmModal(this._app, doc, onConfirm).open();
    }

    /**
     * 清除通知
     */
    clearNotice(): void {
        if (this._currentNotice) {
            this._currentNotice.hide();
            this._currentNotice = null;
        }
    }
}

/**
 * 更新文档状态并通知
 *
 * @param app Obsidian App 实例
 * @param doc 文档信息
 * @param newStatus 新状态
 */
export async function confirmAndUpdateDoc(
    app: App,
    doc: DocInfo,
    newStatus: '已确认' | '未确认'
): Promise<void> {
    const file = findSpecFile(app, doc.filePath);

    if (!file) {
        new Notice(`❌ 文档不存在: ${doc.filePath}`, 5000);
        return;
    }

    await updateDocStatus(app, file, newStatus);
    new Notice(`✓ 文档状态已更新: ${newStatus}`);
}

export default {
    SpecStatusBar,
    SpecConfirmModal,
    SpecNotifier,
    confirmAndUpdateDoc,
};
