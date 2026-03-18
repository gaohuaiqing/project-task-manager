// app/server/src/core/contracts/index.ts
import type { User, Permission, WBSTask } from '../types';

// Auth 模块对外接口
export interface IAuthService {
  validateSession(sessionId: string): Promise<User | null>;
  hasPermission(userId: number, permission: Permission): Promise<boolean>;
  hasAnyPermission(userId: number, permissions: Permission[]): Promise<boolean>;
}

// Org 模块对外接口
export interface IOrgService {
  getUserDepartment(userId: number): Promise<number | null>;
  getDepartmentMembers(departmentId: number): Promise<User[]>;
  getUserCapabilities(userId: number): Promise<CapabilityScore[]>;
}

// Project 模块对外接口
export interface IProjectService {
  isProjectMember(projectId: string, userId: number): Promise<boolean>;
  getProjectMemberIds(projectId: string): Promise<number[]>;
}

// Task 模块对外接口
export interface ITaskService {
  getTaskById(taskId: string): Promise<WBSTask | null>;
  recalculateTaskStatus(taskId: string): Promise<void>;
}

// 能力模型相关
export interface CapabilityScore {
  model_id: string;
  model_name: string;
  dimension_scores: Record<string, number>;
  overall_score: number;
}
