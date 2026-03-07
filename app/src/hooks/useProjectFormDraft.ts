/**
 * 项目表单草稿自动保存 Hook
 *
 * 功能：
 * 1. 自动保存表单数据到 localStorage
 * 2. 页面刷新后恢复表单状态
 * 3. 支持多个项目表单草稿（按项目ID区分）
 * 4. 提供清除草稿功能
 *
 * @module hooks/useProjectFormDraft
 */

import { useEffect, useRef, useCallback } from 'react';
import type { ProjectFormData } from '@/types/project';

// ==================== 常量定义 ====================

const DRAFT_STORAGE_KEY = 'project_form_drafts';
const DRAFT_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7天过期

// ==================== 类型定义 ====================

interface StoredDraft {
  /** 表单数据 */
  formData: ProjectFormData;
  /** 保存时间 */
  savedAt: string;
  /** 项目ID（编辑模式）或 'new'（新建模式） */
  projectId: string | number;
  /** 是否自动保存 */
  autoSave: boolean;
}

interface DraftInfo {
  /** 项目ID */
  projectId: string | number;
  /** 保存时间 */
  savedAt: string;
  /** 相对时间描述 */
  timeAgo: string;
}

// ==================== 工具函数 ====================

/**
 * 获取所有草稿
 */
function getAllDrafts(): StoredDraft[] {
  try {
    const stored = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!stored) return [];

    const drafts: Record<string, StoredDraft> = JSON.parse(stored);

    // 过滤过期草稿
    const now = Date.now();
    const validDrafts: StoredDraft[] = [];

    for (const key in drafts) {
      const draft = drafts[key];
      const savedTime = new Date(draft.savedAt).getTime();

      if (now - savedTime < DRAFT_EXPIRY_MS) {
        validDrafts.push(draft);
      }
    }

    // 更新存储
    if (validDrafts.length !== Object.keys(drafts).length) {
      const newDrafts: Record<string, StoredDraft> = {};
      validDrafts.forEach(draft => {
        newDrafts[`${draft.projectId}`] = draft;
      });
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(newDrafts));
    }

    return validDrafts;
  } catch (error) {
    console.error('读取草稿失败:', error);
    return [];
  }
}

/**
 * 保存草稿
 */
function saveDraft(projectId: string | number, formData: ProjectFormData): void {
  try {
    const drafts = getAllDrafts();
    const draftKey = `${projectId}`;

    const existingIndex = drafts.findIndex(d => `${d.projectId}` === draftKey);

    const newDraft: StoredDraft = {
      formData,
      savedAt: new Date().toISOString(),
      projectId,
      autoSave: true,
    };

    if (existingIndex >= 0) {
      drafts[existingIndex] = newDraft;
    } else {
      drafts.push(newDraft);
    }

    const draftMap: Record<string, StoredDraft> = {};
    drafts.forEach(d => {
      draftMap[`${d.projectId}`] = d;
    });

    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draftMap));
  } catch (error) {
    console.error('保存草稿失败:', error);
  }
}

/**
 * 获取指定项目的草稿
 */
function getDraft(projectId: string | number): StoredDraft | null {
  const drafts = getAllDrafts();
  return drafts.find(d => `${d.projectId}` === `${projectId}`) || null;
}

/**
 * 删除指定项目的草稿
 */
function deleteDraft(projectId: string | number): void {
  try {
    const drafts = getAllDrafts();
    const filtered = drafts.filter(d => `${d.projectId}` !== `${projectId}`);

    const draftMap: Record<string, StoredDraft> = {};
    filtered.forEach(d => {
      draftMap[`${d.projectId}`] = d;
    });

    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draftMap));
  } catch (error) {
    console.error('删除草稿失败:', error);
  }
}

/**
 * 清除所有草稿
 */
function clearAllDrafts(): void {
  try {
    localStorage.removeItem(DRAFT_STORAGE_KEY);
  } catch (error) {
    console.error('清除草稿失败:', error);
  }
}

/**
 * 格式化时间描述
 */
function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return '刚刚';
  if (diffMins < 60) return `${diffMins}分钟前`;
  if (diffHours < 24) return `${diffHours}小时前`;
  if (diffDays < 7) return `${diffDays}天前`;
  return date.toLocaleDateString('zh-CN');
}

// ==================== Hook 定义 ====================

interface UseProjectFormDraftOptions {
  /** 项目ID（编辑模式）或 'new'（新建模式） */
  projectId: string | number;
  /** 表单数据 */
  formData: ProjectFormData;
  /** 是否启用自动保存（默认 true） */
  enabled?: boolean;
  /** 自动保存间隔（毫秒，默认 3000ms） */
  saveInterval?: number;
  /** 草稿加载回调 */
  onDraftLoaded?: (draft: ProjectFormData) => void;
  /** 草稿保存回调 */
  onDraftSaved?: () => void;
}

interface UseProjectFormDraftReturn {
  /** 是否有可恢复的草稿 */
  hasDraft: boolean;
  /** 草稿信息 */
  draftInfo: DraftInfo | null;
  /** 恢复草稿 */
  restoreDraft: () => void;
  /** 清除草稿 */
  clearDraft: () => void;
  /** 手动保存草稿 */
  saveDraftNow: () => void;
  /** 所有草稿列表 */
  allDrafts: DraftInfo[];
  /** 清除所有草稿 */
  clearAllDrafts: () => void;
}

/**
 * 项目表单草稿自动保存 Hook
 */
export function useProjectFormDraft({
  projectId,
  formData,
  enabled = true,
  saveInterval = 3000,
  onDraftLoaded,
  onDraftSaved,
}: UseProjectFormDraftOptions): UseProjectFormDraftReturn {
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasMountedRef = useRef(false);

  // 获取当前项目的草稿
  const draft = getDraft(projectId);
  const hasDraft = !!draft;

  // 获取草稿信息
  const draftInfo: DraftInfo | null = draft ? {
    projectId: draft.projectId,
    savedAt: draft.savedAt,
    timeAgo: formatTimeAgo(draft.savedAt),
  } : null;

  // 获取所有草稿信息
  const allDrafts: DraftInfo[] = getAllDrafts().map(d => ({
    projectId: d.projectId,
    savedAt: d.savedAt,
    timeAgo: formatTimeAgo(d.savedAt),
  }));

  // 首次挂载时检查是否有草稿
  useEffect(() => {
    if (!hasMountedRef.current && enabled && draft) {
      hasMountedRef.current = true;
      // 不自动恢复，由用户选择是否恢复
    }
  }, [enabled, draft]);

  // 监听表单数据变化，自动保存
  useEffect(() => {
    if (!enabled) return;

    // 清除之前的定时器
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    // 设置新的定时器
    saveTimerRef.current = setTimeout(() => {
      saveDraft(projectId, formData);
      onDraftSaved?.();
    }, saveInterval);

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [formData, projectId, enabled, saveInterval, onDraftSaved]);

  // 恢复草稿
  const restoreDraft = useCallback(() => {
    const savedDraft = getDraft(projectId);
    if (savedDraft) {
      onDraftLoaded?.(savedDraft.formData);
    }
  }, [projectId, onDraftLoaded]);

  // 清除当前草稿
  const clearDraft = useCallback(() => {
    deleteDraft(projectId);
  }, [projectId]);

  // 手动保存草稿
  const saveDraftNow = useCallback(() => {
    saveDraft(projectId, formData);
    onDraftSaved?.();
  }, [projectId, formData, onDraftSaved]);

  return {
    hasDraft,
    draftInfo,
    restoreDraft,
    clearDraft,
    saveDraftNow,
    allDrafts,
    clearAllDrafts,
  };
}

// ==================== 工具函数导出 ====================

/**
 * 检查是否有可用的草稿
 */
export function hasAvailableDrafts(): boolean {
  return getAllDrafts().length > 0;
}

/**
 * 获取所有草稿信息
 */
export function getAllDraftInfo(): DraftInfo[] {
  return getAllDrafts().map(d => ({
    projectId: d.projectId,
    savedAt: d.savedAt,
    timeAgo: formatTimeAgo(d.savedAt),
  }));
}

/**
 * 清除指定项目的草稿
 */
export function clearProjectDraft(projectId: string | number): void {
  deleteDraft(projectId);
}

/**
 * 清除所有草稿
 */
export function clearAllProjectDrafts(): void {
  clearAllDrafts();
}

export default useProjectFormDraft;
