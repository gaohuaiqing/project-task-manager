/**
 * 项目列表骨架屏组件
 *
 * 功能：
 * 1. 提供优雅的加载占位效果
 * 2. 模拟真实项目列表布局
 * 3. 支持动画效果
 * 4. 可配置骨架数量
 *
 * @module components/projects/ProjectListSkeleton
 */

import React from 'react';

interface ProjectListSkeletonProps {
  /** 显示的骨架项目数量 */
  count?: number;
  /** 是否显示动画 */
  animated?: boolean;
}

/**
 * 单个项目卡片骨架
 */
const ProjectCardSkeleton: React.FC<{ animated?: boolean }> = ({ animated = true }) => {
  return (
    <div className="bg-card rounded-lg border border-border p-6 mb-4">
      {/* 项目标题行 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          {/* 项目图标 */}
          <div
            className={`w-10 h-10 rounded-lg bg-muted ${
              animated ? 'animate-pulse' : ''
            }`}
          />
          {/* 项目代码 */}
          <div
            className={`h-5 w-20 bg-muted rounded ${
              animated ? 'animate-pulse' : ''
            }`}
          />
        </div>
        {/* 状态标签 */}
        <div
          className={`h-6 w-16 bg-muted rounded-full ${
            animated ? 'animate-pulse' : ''
          }`}
        />
      </div>

      {/* 项目名称 */}
      <div
        className={`h-6 w-3/4 bg-muted rounded mb-3 ${
          animated ? 'animate-pulse' : ''
        }`}
      />

      {/* 项目描述 */}
      <div className="space-y-2 mb-4">
        <div
          className={`h-4 w-full bg-muted rounded ${
            animated ? 'animate-pulse' : ''
          }`}
        />
        <div
          className={`h-4 w-2/3 bg-muted rounded ${
            animated ? 'animate-pulse' : ''
          }`}
        />
      </div>

      {/* 进度条 */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <div
            className={`h-4 w-20 bg-muted rounded ${
              animated ? 'animate-pulse' : ''
            }`}
          />
          <div
            className={`h-4 w-12 bg-muted rounded ${
              animated ? 'animate-pulse' : ''
            }`}
          />
        </div>
        <div className="h-2 w-full bg-muted rounded overflow-hidden">
          <div
            className={`h-full w-1/3 bg-muted-foreground/20 ${
              animated ? 'animate-pulse' : ''
            }`}
          />
        </div>
      </div>

      {/* 项目信息 */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center space-x-4">
          {/* 成员图标 */}
          <div className="flex items-center space-x-2">
            <div
              className={`w-5 h-5 rounded-full bg-muted ${
                animated ? 'animate-pulse' : ''
              }`}
            />
            <div
              className={`h-4 w-16 bg-muted rounded ${
                animated ? 'animate-pulse' : ''
              }`}
            />
          </div>
          {/* 任务图标 */}
          <div className="flex items-center space-x-2">
            <div
              className={`w-5 h-5 rounded bg-muted ${
                animated ? 'animate-pulse' : ''
              }`}
            />
            <div
              className={`h-4 w-16 bg-muted rounded ${
                animated ? 'animate-pulse' : ''
              }`}
            />
          </div>
        </div>
        {/* 操作按钮 */}
        <div className="flex items-center space-x-2">
          <div
            className={`h-8 w-16 bg-muted rounded ${
              animated ? 'animate-pulse' : ''
            }`}
          />
          <div
            className={`h-8 w-16 bg-muted rounded ${
              animated ? 'animate-pulse' : ''
            }`}
          />
        </div>
      </div>
    </div>
  );
};

/**
 * 项目列表骨架屏组件
 */
export const ProjectListSkeleton: React.FC<ProjectListSkeletonProps> = ({
  count = 5,
  animated = true
}) => {
  return (
    <div className="space-y-4 p-6">
      {/* 标题行骨架 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div
            className={`h-7 w-32 bg-muted rounded mb-2 ${
              animated ? 'animate-pulse' : ''
            }`}
          />
          <div
            className={`h-4 w-48 bg-muted rounded ${
              animated ? 'animate-pulse' : ''
            }`}
          />
        </div>
        <div
          className={`h-10 w-28 bg-muted rounded ${
            animated ? 'animate-pulse' : ''
          }`}
        />
      </div>

      {/* 筛选器骨架 */}
      <div className="flex items-center space-x-3 mb-6">
        <div
          className={`h-10 w-32 bg-muted rounded ${
            animated ? 'animate-pulse' : ''
          }`}
        />
        <div
          className={`h-10 w-32 bg-muted rounded ${
            animated ? 'animate-pulse' : ''
          }`}
        />
        <div
          className={`h-10 w-32 bg-muted rounded ${
            animated ? 'animate-pulse' : ''
          }`}
        />
      </div>

      {/* 项目卡片骨架列表 */}
      {Array.from({ length: count }).map((_, index) => (
        <ProjectCardSkeleton key={index} animated={animated} />
      ))}
    </div>
  );
};

/**
 * 表格行骨架（用于表格视图）
 */
export const ProjectTableRowSkeleton: React.FC<{ animated?: boolean }> = ({
  animated = true
}) => {
  return (
    <tr className="border-b border-border">
      <td className="p-4">
        <div
          className={`h-5 w-24 bg-muted rounded ${
            animated ? 'animate-pulse' : ''
          }`}
        />
      </td>
      <td className="p-4">
        <div
          className={`h-5 w-40 bg-muted rounded ${
            animated ? 'animate-pulse' : ''
          }`}
        />
      </td>
      <td className="p-4">
        <div
          className={`h-5 w-20 bg-muted rounded-full ${
            animated ? 'animate-pulse' : ''
          }`}
        />
      </td>
      <td className="p-4">
        <div className="flex items-center space-x-2">
          <div
            className={`h-2 w-20 bg-muted rounded ${
              animated ? 'animate-pulse' : ''
            }`}
          />
          <div
            className={`h-4 w-12 bg-muted rounded ${
              animated ? 'animate-pulse' : ''
            }`}
          />
        </div>
      </td>
      <td className="p-4">
        <div
          className={`h-5 w-16 bg-muted rounded ${
            animated ? 'animate-pulse' : ''
          }`}
        />
      </td>
      <td className="p-4">
        <div
          className={`h-5 w-16 bg-muted rounded ${
            animated ? 'animate-pulse' : ''
          }`}
        />
      </td>
      <td className="p-4">
        <div className="flex items-center space-x-2">
          <div
            className={`h-8 w-16 bg-muted rounded ${
              animated ? 'animate-pulse' : ''
            }`}
          />
          <div
            className={`h-8 w-16 bg-muted rounded ${
              animated ? 'animate-pulse' : ''
            }`}
          />
        </div>
      </td>
    </tr>
  );
};

export default ProjectListSkeleton;
