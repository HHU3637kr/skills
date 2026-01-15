/**
 * 工具函数模块
 *
 * 根据 plan.md: spec/03-功能实现/20260115-1617-Obsidian插件-Spec确认工作流/plan.md
 * 章节: 实现步骤 - 步骤 6: 文档状态管理
 */

import { App, TFile, Vault, FileManager } from 'obsidian';
import { DocType, DocStatus } from './status-manager.js';

/**
 * 解析文档 frontmatter
 *
 * @param app Obsidian App 实例
 * @param file 文档文件
 * @returns Promise<Record<string, unknown>> frontmatter 对象
 */
export async function parseDocFrontmatter(
    app: App,
    file: TFile
): Promise<Record<string, unknown>> {
    return new Promise((resolve, reject) => {
        const fileManager = app.vault;

        // 使用 Obsidian 的 processFrontMatter 解析 frontmatter
        (fileManager as unknown as FileManager & { processFrontMatter: (file: TFile, callback: (frontmatter: Record<string, unknown>) => void) => void })
            .processFrontMatter(file, (frontmatter) => {
                resolve(frontmatter || {});
            });
    });
}

/**
 * 更新文档状态
 *
 * @param app Obsidian App 实例
 * @param file 文档文件
 * @param newStatus 新状态
 */
export async function updateDocStatus(
    app: App,
    file: TFile,
    newStatus: DocStatus
): Promise<void> {
    // 使用 Obsidian 的 fileManager.processFrontMatter 原子更新 frontmatter
    await app.fileManager.processFrontMatter(file, (frontmatter) => {
        frontmatter.status = newStatus;
    });
}

/**
 * 识别文档类型
 *
 * @param filePath 文档路径
 * @returns DocType | null 文档类型，如果无法识别则返回 null
 */
export function detectDocType(filePath: string): DocType | null {
    const fileName = filePath.split('/').pop() || '';

    if (fileName === 'plan.md') {
        return 'plan';
    } else if (fileName.startsWith('update-') && fileName.endsWith('.md') && !fileName.includes('-summary') && !fileName.includes('-review')) {
        return 'update';
    } else if (fileName.endsWith('-summary.md') || fileName === 'summary.md') {
        return 'summary';
    } else if (fileName.endsWith('-review.md') || fileName === 'review.md') {
        return 'review';
    }

    return null;
}

/**
 * 查找文档
 *
 * @param app Obsidian App 实例
 * @param path 文档路径（相对于 vault 根目录）
 * @returns TFile | null 文档文件，如果不存在则返回 null
 */
export function findSpecFile(app: App, path: string): TFile | null {
    // 尝试多种路径格式
    const pathsToTry = [
        path,                                    // 原始路径
        path.replace(/\//g, '\\'),              // 正斜杠转反斜杠
        path.replace(/\\/g, '/'),               // 反斜杠转正斜杠
    ];

    // 如果路径以 spec/ 开头，尝试去除它（vault 根目录可能已经是 spec/）
    if (path.startsWith('spec/') || path.startsWith('spec\\')) {
        pathsToTry.push(
            path.substring(5),                   // 去除 spec/ 前缀
            path.substring(5).replace(/\//g, '\\'),  // 去除前缀后转反斜杠
        );
    }

    // 首先尝试 getAbstractFileByPath（更快）
    for (const p of pathsToTry) {
        const file = app.vault.getAbstractFileByPath(p);
        if (file instanceof TFile) {
            return file;
        }
    }

    // 最后遍历所有 Markdown 文件来查找
    const allFiles = app.vault.getMarkdownFiles();
    for (const f of allFiles) {
        // 比较时统一使用正斜杠
        const normalizedFilePath = f.path.replace(/\\/g, '/');
        for (const p of pathsToTry) {
            const normalizedSearchPath = p.replace(/\\/g, '/');
            if (normalizedFilePath === normalizedSearchPath || f.path === p) {
                return f;
            }
        }
    }

    return null;
}

/**
 * 检查文档是否在 spec/ 目录下
 *
 * @param filePath 文档路径
 * @returns boolean 是否在 spec/ 目录下
 */
export function isSpecFile(filePath: string): boolean {
    return filePath.startsWith('spec/') || filePath.startsWith('\\spec\\');
}

/**
 * 获取文档标题
 *
 * @param app Obsidian App 实例
 * @param file 文档文件
 * @returns string 文档标题
 */
export async function getDocTitle(app: App, file: TFile): Promise<string> {
    try {
        const frontmatter = await parseDocFrontmatter(app, file);
        return (frontmatter.title as string) || file.basename;
    } catch {
        return file.basename;
    }
}

/**
 * 获取文档状态
 *
 * @param app Obsidian App 实例
 * @param file 文档文件
 * @returns Promise<DocStatus> 文档状态
 */
export async function getDocStatus(app: App, file: TFile): Promise<DocStatus> {
    try {
        const frontmatter = await parseDocFrontmatter(app, file);
        return (frontmatter.status as DocStatus) || '未确认';
    } catch {
        return '未确认';
    }
}

/**
 * 打开文档
 *
 * @param app Obsidian App 实例
 * @param file 文档文件
 */
export async function openDoc(app: App, file: TFile): Promise<void> {
    await app.workspace.openLinkText(file.path, 'true');
}

export default {
    parseDocFrontmatter,
    updateDocStatus,
    detectDocType,
    findSpecFile,
    isSpecFile,
    getDocTitle,
    getDocStatus,
    openDoc,
};
