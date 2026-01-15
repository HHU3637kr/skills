/**
 * Obsidian Spec Confirm Plugin
 *
 * 与 Claude Code 集成，实现 Spec 文档一键确认工作流
 *
 * 根据 plan.md: spec/03-功能实现/20260115-1617-Obsidian插件-Spec确认工作流/plan.md
 * 章节: 实现步骤 - 步骤 7: 主插件集成
 */

import { Plugin, Notice, TAbstractFile, TFile, Setting, PluginSettingTab, App, WorkspaceLeaf } from 'obsidian';
import { MCPServer } from './src/mcp-server.js';
import { StatusManager, ConfirmAction, ServerStatus } from './src/status-manager.js';
import { SpecStatusBar, SpecNotifier, confirmAndUpdateDoc } from './src/ui-components.js';
import { findSpecFile, updateDocStatus, isSpecFile, detectDocType } from './src/utils.js';
import { SpecConfirmSidebar, VIEW_TYPE_SPEC_CONFIRM } from './src/sidebar.js';

/**
 * 插件设置接口
 */
interface SpecConfirmSettings {
    port: number;              // MCP Server 起始端口
    autoStart: boolean;        // 是否自动启动 MCP Server
}

/**
 * 默认设置
 */
const DEFAULT_SETTINGS: SpecConfirmSettings = {
    port: 5300,
    autoStart: true,
};

/**
 * 主插件类
 */
export default class SpecConfirmPlugin extends Plugin {
    settings: SpecConfirmSettings;
    mcpServer: MCPServer | null = null;
    statusManager: StatusManager | null = null;
    statusBar: SpecStatusBar | null = null;
    notifier: SpecNotifier | null = null;
    sidebar: SpecConfirmSidebar | null = null;

    /**
     * 插件加载时调用
     */
    async onload() {
        console.log('[SpecConfirm] Loading plugin');

        // 加载设置
        await this.loadSettings();

        // 注册侧边栏视图类型
        this.registerView(
            VIEW_TYPE_SPEC_CONFIRM,
            (leaf: WorkspaceLeaf) => {
                this.sidebar = new SpecConfirmSidebar(leaf);
                return this.sidebar;
            }
        );

        // 初始化状态管理器
        this.statusManager = new StatusManager(this.settings.port);

        // 初始化 MCP Server
        this.mcpServer = new MCPServer(this.settings.port, this.statusManager);

        // 自动启动 MCP Server
        if (this.settings.autoStart) {
            const started = await this.mcpServer.start();
            if (started) {
                new Notice('✓ Spec Confirm MCP Server 已启动');
                this.addRibbonIcon('check-circle', 'Spec Confirm', () => {
                    this._activateSidebar();
                });
            } else {
                new Notice('❌ MCP Server 启动失败', 5000);
            }
        }

        // 初始化 UI 组件
        this.statusBar = new SpecStatusBar(this.addStatusBarItem(), this.app);
        this.notifier = new SpecNotifier(this.app);

        // 注册状态变化回调
        this.statusManager.onStatusChange((status: ServerStatus) => {
            this._onStatusChange(status);
        });

        // 注册命令
        this._addCommands();

        // 注册文件监听
        this._registerEvents();

        // 添加设置标签
        this.addSettingTab(new SpecConfirmSettingTab(this.app, this));
    }

    /**
     * 插件卸载时调用
     */
    async onunload() {
        console.log('[SpecConfirm] Unloading plugin');

        // 停止 MCP Server
        if (this.mcpServer) {
            await this.mcpServer.stop();
        }

        // 清理状态管理器
        if (this.statusManager) {
            this.statusManager.dispose();
        }

        // 隐藏状态栏
        if (this.statusBar) {
            this.statusBar.hide();
        }
    }

    /**
     * 加载设置
     */
    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    /**
     * 保存设置
     */
    async saveSettings() {
        await this.saveData(this.settings);
    }

    /**
     * 注册命令
     */
    _addCommands() {
        // 打开侧边栏
        this.addCommand({
            id: 'show-spec-confirm-sidebar',
            name: '打开 Spec 确认侧边栏',
            callback: () => {
                this._activateSidebar();
            },
        });

        // 确认当前 Spec 文档
        this.addCommand({
            id: 'confirm-current-spec',
            name: '确认当前 Spec 文档',
            checkCallback: (checking: boolean) => {
                const activeFile = this.app.workspace.getActiveFile();
                const docType = activeFile && detectDocType(activeFile.path);

                if (activeFile && docType && isSpecFile(activeFile.path)) {
                    if (!checking) {
                        this._confirmCurrentDoc(activeFile as TFile);
                    }
                    return true;
                }
                return false;
            },
        });

        // 启动 MCP Server
        this.addCommand({
            id: 'start-mcp-server',
            name: '启动 MCP Server',
            checkCallback: (checking: boolean) => {
                const isRunning = this.mcpServer?.isRunning ?? false;
                if (!checking && !isRunning) {
                    this.mcpServer?.start().then((started: boolean) => {
                        if (started) {
                            new Notice('✓ MCP Server 已启动');
                        } else {
                            new Notice('❌ MCP Server 启动失败', 5000);
                        }
                    });
                }
                return !isRunning;
            },
        });

        // 停止 MCP Server
        this.addCommand({
            id: 'stop-mcp-server',
            name: '停止 MCP Server',
            checkCallback: (checking: boolean) => {
                const isRunning = this.mcpServer?.isRunning ?? false;
                if (!checking && isRunning) {
                    this.mcpServer?.stop().then(() => {
                        new Notice('✓ MCP Server 已停止');
                    });
                }
                return isRunning;
            },
        });

        // 显示服务器状态
        this.addCommand({
            id: 'show-server-status',
            name: '显示 MCP Server 状态',
            callback: () => {
                const status = this.statusManager?.getStatus();
                if (status) {
                    new Notice(
                        `MCP Server: ${status.running ? '运行中' : '已停止'}\n端口: ${status.port}\n等待确认: ${status.waiting ? '是' : '否'}`
                    );
                }
            },
        });
    }

    /**
     * 注册事件监听
     */
    _registerEvents() {
        // 监听文件修改（用于刷新状态）
        this.registerEvent(
            this.app.vault.on('modify', (file: TAbstractFile) => {
                if (file instanceof TFile && isSpecFile(file.path)) {
                    // 文件被修改时，如果正在等待确认这个文档，可以刷新状态
                    const status = this.statusManager?.getStatus();
                    if (status?.waiting && status.currentDoc?.filePath === file.path) {
                        // 可以在这里添加刷新逻辑
                    }
                }
            })
        );
    }

    /**
     * 状态变化回调
     */
    async _onStatusChange(status: ServerStatus) {
        // 更新状态栏
        if (this.statusBar) {
            this.statusBar.update(status.currentDoc);
        }

        // 更新侧边栏
        if (status.waiting && status.currentDoc) {
            // 先获取最新的侧边栏实例
            await this._activateSidebar();

            // 确保使用最新的侧边栏实例
            const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_SPEC_CONFIRM);
            if (leaves.length > 0) {
                this.sidebar = leaves[0].view as SpecConfirmSidebar;
            }

            if (this.sidebar) {
                this.sidebar.updateStatus(status.currentDoc, (action: ConfirmAction, userMessage?: string) => {
                    this._handleUserConfirm(action, userMessage);
                });
            }

            // 显示非阻塞通知
            new Notice(`🔔 等待确认: ${status.currentDoc.title}`, 5000);
        } else if (!status.waiting && this.sidebar) {
            this.sidebar.updateStatus(null, () => {});
        }

        // 广播状态
        if (this.mcpServer) {
            this.mcpServer.broadcastStatus();
        }
    }

    /**
     * 激活侧边栏
     */
    async _activateSidebar(): Promise<void> {
        const { workspace } = this.app;
        let leaf: WorkspaceLeaf | null = null;

        // 查找现有侧边栏
        const leaves = workspace.getLeavesOfType(VIEW_TYPE_SPEC_CONFIRM);
        if (leaves.length > 0) {
            leaf = leaves[0];
            // 更新 sidebar 引用为当前实例
            this.sidebar = leaf.view as SpecConfirmSidebar;
        } else {
            // 创建新的侧边栏（右侧）
            leaf = workspace.getRightLeaf(false);
            if (leaf) {
                await leaf.setViewState({ type: VIEW_TYPE_SPEC_CONFIRM, active: true });
                // 等待视图创建后更新引用
                setTimeout(() => {
                    const newLeaves = workspace.getLeavesOfType(VIEW_TYPE_SPEC_CONFIRM);
                    if (newLeaves.length > 0) {
                        this.sidebar = newLeaves[0].view as SpecConfirmSidebar;
                    }
                }, 100);
            }
        }

        // 显示侧边栏
        if (leaf) {
            workspace.revealLeaf(leaf);
        }
    }

    /**
     * 处理用户确认
     */
    async _handleUserConfirm(action: ConfirmAction, userMessage?: string) {
        const status = this.statusManager?.getStatus();
        const currentDoc = status?.currentDoc;

        if (!currentDoc) {
            return;
        }

        // 更新文档状态
        if (action === 'continue') {
            const file = findSpecFile(this.app, currentDoc.filePath);
            if (file) {
                await updateDocStatus(this.app, file as TFile, '已确认');
                new Notice(`✓ ${currentDoc.title} 已确认`);
            }
        }

        // 通知状态管理器
        this.statusManager?.handleConfirm(action, userMessage);
    }

    /**
     * 确认当前文档
     */
    async _confirmCurrentDoc(file: TFile) {
        const docType = detectDocType(file.path);
        if (!docType) {
            new Notice('❌ 不是 Spec 文档');
            return;
        }

        // 显示确认模态框
        if (this.notifier) {
            this.notifier.showConfirmModal({
                filePath: file.path,
                docType,
                title: file.basename,
                status: '未确认',
            }, (action: ConfirmAction, userMessage?: string) => {
                this._handleUserConfirm(action, userMessage);
            });
        }
    }
}

/**
 * 设置标签页
 */
class SpecConfirmSettingTab extends PluginSettingTab {
    plugin: SpecConfirmPlugin;

    constructor(app: App, plugin: SpecConfirmPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        containerEl.createEl('h2', { text: 'Obsidian Spec Confirm 设置' });

        new Setting(containerEl)
            .setName('MCP Server 端口')
            .setDesc('MCP Server 的起始端口（如果被占用会自动递增）')
            .addText((text: any) =>
                text
                    .setPlaceholder('5300')
                    .setValue(this.plugin.settings.port.toString())
                    .onChange(async (value: string) => {
                        const port = parseInt(value);
                        if (!isNaN(port) && port > 0 && port < 65536) {
                            this.plugin.settings.port = port;
                            await this.plugin.saveSettings();
                        }
                    })
            );

        new Setting(containerEl)
            .setName('自动启动 MCP Server')
            .setDesc('插件加载时自动启动 MCP Server')
            .addToggle((toggle: any) =>
                toggle
                    .setValue(this.plugin.settings.autoStart)
                    .onChange(async (value: boolean) => {
                        this.plugin.settings.autoStart = value;
                        await this.plugin.saveSettings();
                    })
            );

        // 显示当前状态
        const status = this.plugin.statusManager?.getStatus();
        const statusDiv = containerEl.createDiv();
        statusDiv.createEl('h3', { text: '当前状态' });
        statusDiv.createEl('p', { text: `MCP Server: ${status?.running ? '运行中' : '已停止'}` });
        statusDiv.createEl('p', { text: `端口: ${status?.port || '未设置'}` });
        statusDiv.createEl('p', { text: `等待确认: ${status?.waiting ? '是' : '否'}` });
        if (status?.currentDoc) {
            statusDiv.createEl('p', { text: `当前文档: ${status.currentDoc.title}` });
        }
    }
}
