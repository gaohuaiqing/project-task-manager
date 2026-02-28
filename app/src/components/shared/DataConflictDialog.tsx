/**
 * 数据冲突解决对话框
 *
 * 功能：
 * 1. 显示冲突详情（本地数据 vs 服务器数据）
 * 2. 提供三种解决策略：
 *    - 保留本地更改（强制覆盖）
 *    - 采用服务器版本（丢弃本地更改）
 *    - 手动合并（自定义编辑）
 * 3. 显示差异高亮
 * 4. 支持变更原因备注
 */

import React, { useState } from 'react';

// ================================================================
// 类型定义
// ================================================================

export interface ConflictData {
  dataType: string;
  dataId: string;
  message: string;
  serverData: any;
  serverVersion: number;
  localData?: any;
  localVersion?: number;
}

export type ConflictResolution = 'keep_local' | 'use_server' | 'manual_merge';

export interface ConflictResolutionResult {
  action: ConflictResolution;
  mergedData?: any;
  changeReason?: string;
}

interface Props {
  isOpen: boolean;
  conflict: ConflictData | null;
  onResolve: (result: ConflictResolutionResult) => void;
  onCancel?: () => void;
  dataTypeLabels?: Record<string, string>;
}

// ================================================================
// 组件
// ================================================================

export const DataConflictDialog: React.FC<Props> = ({
  isOpen,
  conflict,
  onResolve,
  onCancel,
  dataTypeLabels = {}
}) => {
  const [selectedAction, setSelectedAction] = useState<ConflictResolution | null>(null);
  const [changeReason, setChangeReason] = useState('');
  const [showDiff, setShowDiff] = useState(false);
  const [mergedData, setMergedData] = useState<any>(null);

  if (!conflict || !isOpen) return null;

  const dataTypeLabel = dataTypeLabels[conflict.dataType] || conflict.dataType;

  // 计算差异
  const differences = calculateDifferences(conflict.localData, conflict.serverData);

  const handleResolve = () => {
    if (!selectedAction) return;

    onResolve({
      action: selectedAction,
      mergedData: selectedAction === 'manual_merge' ? mergedData : undefined,
      changeReason: changeReason || undefined
    });

    // 重置状态
    setSelectedAction(null);
    setChangeReason('');
    setShowDiff(false);
    setMergedData(null);
  };

  const handleCancel = () => {
    setSelectedAction(null);
    setChangeReason('');
    setShowDiff(false);
    setMergedData(null);
    onCancel?.();
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm transition-opacity"
          onClick={handleCancel}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden transition-all"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-orange-500 to-red-500 px-6 py-4 text-white">
              <div className="flex items-center gap-3">
                <div className="bg-white bg-opacity-20 rounded-full p-2">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-2xl font-bold">数据冲突检测</h2>
                  <p className="text-sm text-white text-opacity-90">
                    {dataTypeLabel} - {conflict.dataId}
                  </p>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
              {/* 冲突说明 */}
              <div className="mb-6 p-4 bg-orange-50 border-l-4 border-orange-500 rounded">
                <p className="text-orange-900 font-medium">{conflict.message}</p>
                <p className="text-sm text-orange-700 mt-2">
                  该数据已被其他用户修改。当前服务器版本为 <strong>v{conflict.serverVersion}</strong>，
                  {conflict.localVersion && `您的本地版本为 v${conflict.localVersion}。`}
                  请选择如何解决此冲突。
                </p>
              </div>

              {/* 版本对比 */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                {/* 本地版本 */}
                <div className="border-2 border-blue-200 rounded-lg p-4 bg-blue-50">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="bg-blue-500 text-white px-2 py-1 rounded text-sm font-medium">
                      您的版本
                    </div>
                    {conflict.localVersion && (
                      <span className="text-sm text-gray-600">v{conflict.localVersion}</span>
                    )}
                  </div>
                  <pre className="text-xs bg-white p-3 rounded border overflow-auto max-h-64">
                    {JSON.stringify(conflict.localData, null, 2)}
                  </pre>
                </div>

                {/* 服务器版本 */}
                <div className="border-2 border-green-200 rounded-lg p-4 bg-green-50">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="bg-green-500 text-white px-2 py-1 rounded text-sm font-medium">
                      服务器版本
                    </div>
                    <span className="text-sm text-gray-600">v{conflict.serverVersion}</span>
                  </div>
                  <pre className="text-xs bg-white p-3 rounded border overflow-auto max-h-64">
                    {JSON.stringify(conflict.serverData, null, 2)}
                  </pre>
                </div>
              </div>

              {/* 差异高亮 */}
              {differences.length > 0 && (
                <div className="mb-6">
                  <button
                    onClick={() => setShowDiff(!showDiff)}
                    className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 mb-3"
                  >
                    <svg
                      className={`w-4 h-4 transform transition-transform ${showDiff ? 'rotate-90' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    显示差异详情 ({differences.length} 处)
                  </button>

                  {showDiff && (
                    <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                      {differences.map((diff, index) => (
                        <div key={index} className="flex items-start gap-3 text-sm">
                          <span className="font-mono text-gray-500 min-w-[100px]">{diff.field}</span>
                          <div className="flex-1">
                            <span className="text-red-600 line-through mr-2">{diff.oldValue}</span>
                            <span className="text-green-600">→ {diff.newValue}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* 解决方案选择 */}
              <div className="space-y-3 mb-6">
                <h3 className="font-medium text-gray-900">选择解决方案：</h3>

                <label className="flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                  <input
                    type="radio"
                    name="resolution"
                    value="keep_local"
                    checked={selectedAction === 'keep_local'}
                    onChange={(e) => setSelectedAction(e.target.value as ConflictResolution)}
                    className="mt-1"
                  />
                  <div>
                    <div className="font-medium text-gray-900">保留我的更改</div>
                    <div className="text-sm text-gray-600">
                      强制用本地数据覆盖服务器版本（可能会覆盖其他用户的更改）
                    </div>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                  <input
                    type="radio"
                    name="resolution"
                    value="use_server"
                    checked={selectedAction === 'use_server'}
                    onChange={(e) => setSelectedAction(e.target.value as ConflictResolution)}
                    className="mt-1"
                  />
                  <div>
                    <div className="font-medium text-gray-900">采用服务器版本</div>
                    <div className="text-sm text-gray-600">
                      丢弃本地更改，使用服务器最新版本
                    </div>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                  <input
                    type="radio"
                    name="resolution"
                    value="manual_merge"
                    checked={selectedAction === 'manual_merge'}
                    onChange={(e) => setSelectedAction(e.target.value as ConflictResolution)}
                    className="mt-1"
                  />
                  <div>
                    <div className="font-medium text-gray-900">手动合并</div>
                    <div className="text-sm text-gray-600">
                      自定义编辑合并后的数据（高级用户）
                    </div>
                  </div>
                </label>
              </div>

              {/* 手动合并编辑器 */}
              {selectedAction === 'manual_merge' && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    合并后的数据（JSON 格式）：
                  </label>
                  <textarea
                    value={mergedData ? JSON.stringify(mergedData, null, 2) : JSON.stringify(conflict.serverData, null, 2)}
                    onChange={(e) => {
                      try {
                        setMergedData(JSON.parse(e.target.value));
                      } catch {
                        // 忽略 JSON 解析错误
                      }
                    }}
                    className="w-full h-48 p-3 border rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="输入合并后的 JSON 数据..."
                  />
                </div>
              )}

              {/* 变更原因 */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  变更原因（可选）：
                </label>
                <input
                  type="text"
                  value={changeReason}
                  onChange={(e) => setChangeReason(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="例如：修复紧急 bug、更新客户信息等"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t">
              <button
                onClick={handleCancel}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleResolve}
                disabled={!selectedAction}
                className="px-6 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg hover:from-orange-600 hover:to-red-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
              >
                应用解决方案
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// ================================================================
// 工具函数
// ================================================================

interface Difference {
  field: string;
  oldValue: any;
  newValue: any;
}

function calculateDifferences(localData: any, serverData: any): Difference[] {
  const differences: Difference[] = [];

  function compareObjects(local: any, server: any, path: string = '') {
    const allKeys = new Set([...Object.keys(local || {}), ...Object.keys(server || {})]);

    allKeys.forEach((key) => {
      const localValue = local?.[key];
      const serverValue = server?.[key];
      const currentPath = path ? `${path}.${key}` : key;

      if (JSON.stringify(localValue) !== JSON.stringify(serverValue)) {
        if (typeof localValue === 'object' && localValue !== null && !Array.isArray(localValue)) {
          compareObjects(localValue, serverValue, currentPath);
        } else {
          differences.push({
            field: currentPath,
            oldValue: localValue,
            newValue: serverValue
          });
        }
      }
    });
  }

  compareObjects(localData, serverData);

  return differences;
}

export default DataConflictDialog;
