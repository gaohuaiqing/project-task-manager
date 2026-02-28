/**
 * 组织及人员设置主入口组件
 *
 * 职责：
 * 1. 权限控制（工程师隐藏）
 * 2. 初始状态检测（无数据显示创建表单/导入按钮）
 * 3. 整合子组件，管理整体状态
 */

import { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, Download, Upload, Settings, Trash2, Users, Plus, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { canAccessOrganization, canEditOrganization } from '@/types/auth';
import {
  getOrganization,
  getAllMembers,
  getAllTechGroups,
  saveOrganization,
  clearOrganization,
  deleteNode
} from '@/utils/organizationManager';
import { downloadOrganizationExcel } from '@/utils/excelHandler';
import { WebSocketService } from '@/services/WebSocketService';
import { broadcastService } from '@/services/BroadcastChannelService';
import { indexedDBSyncService } from '@/services/IndexedDBSyncService';
import { DialogProvider } from '@/components/common/DialogProvider';
import { useDialog } from '@/hooks/useDialog';

import { OrganizationTree } from './OrganizationTree';
import { OrganizationDetailPanelWithDialogs } from './OrganizationDetailPanel';
import { ImportExportDialog } from './ImportExportDialog';
import { CreateOrganizationDialog } from './CreateOrganizationDialog';
import { CapabilityModelSettings } from './CapabilityModelSettings';
import type { OrgLevelType, OrganizationStructure } from '@/types/organization';

export function OrganizationSettings() {
  const { user } = useAuth();
  const dialog = useDialog();
  const [orgStructure, setOrgStructure] = useState<OrganizationStructure | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedNodeType, setNodeType] = useState<OrgLevelType | null>(null);
  const [dialogOpen, setDialogOpen] = useState<'import' | 'export' | 'capability' | 'create' | 'edit' | null>(null);
  const [editingNodeInfo, setEditingNodeInfo] = useState<{ nodeId: string; nodeType: OrgLevelType } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 使用 ref 追踪最新的组织架构版本，用于 IndexedDB 监听器
  const orgVersionRef = useRef<number>(0);
  orgVersionRef.current = orgStructure?.version || 0;

  const canEdit = canEditOrganization(user);
  // 检查组织架构是否真的有数据（至少有一个部门）
  const hasOrg = orgStructure !== null &&
                 orgStructure.departments &&
                 orgStructure.departments.length > 0;

  // 加载组织架构
  useEffect(() => {
    let isMounted = true;
    const loadOrganization = async () => {
      setIsLoading(true);
      const org = await getOrganization();
      if (isMounted) {
        setOrgStructure(org);
        setIsLoading(false);
        console.log('[OrganizationSettings] 组织架构加载完成，部门数量:', org?.departments?.length || 0);
      }
    };

    loadOrganization();

    // 1. 监听 localStorage 变化（跨标签页同步）
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'org_structure' && e.newValue) {
        console.log('[OrganizationSettings] 检测到localStorage变化，重新加载组织架构');
        try {
          const newOrg = JSON.parse(e.newValue);
          if (isMounted) {
            setOrgStructure(newOrg);
          }
        } catch (error) {
          console.error('[OrganizationSettings] localStorage数据解析失败:', error);
        }
      }
    };

    // 2. 监听 WebSocket 全局数据更新（跨设备同步）
    const wsService = WebSocketService.getInstance();
    const messageHandler = (message: any) => {
      if (message.type === 'global_data_updated' &&
          message.data?.dataType === 'organization_units') {
        const newOrg = message.data.data;
        console.log('[OrganizationSettings] 收到WebSocket更新，版本:', newOrg?.version);
        // 保存到 localStorage 并更新状态
        if (newOrg) {
          try {
            localStorage.setItem('org_structure', JSON.stringify(newOrg));
            console.log('[OrganizationSettings] WebSocket更新已保存到 localStorage');
          } catch (error) {
            console.warn('[OrganizationSettings] localStorage保存失败:', error);
          }
          setOrgStructure(newOrg);
        }
      }
    };

    // 3. 监听 BroadcastChannel 数据更新（同一浏览器不同标签页）
    const unsubscribeBroadcast = broadcastService.onDataUpdate((data, dataType) => {
      if (dataType === 'organization_units' && isMounted) {
        console.log('[OrganizationSettings] 收到BroadcastChannel更新，版本:', data?.version, '部门数量:', data?.departments?.length || 0);
        setOrgStructure(data);
      }
    });

    // 4. 监听 IndexedDB 数据更新（跨浏览器同步）- 只初始化一次
    // 注意：由于单例模式，indexedDBSyncService 在整个应用中只有一个实例
    // 我们使用一个全局标志来确保监听器只被添加一次
    const INDEXEDDB_LISTENER_KEY = 'org_settings_indexeddb_listener_initialized';

    if (!(window as any)[INDEXEDDB_LISTENER_KEY]) {
      indexedDBSyncService.init()
        .then(() => {
          const unsubscribe = indexedDBSyncService.onDataChange('organization_units', (data) => {
            if (!isMounted) return;

            // 版本检查：基于 ref 中的最新版本
            const currentVersion = orgVersionRef.current;
            const newVersion = data?.version || 0;

            console.log('[OrganizationSettings] 收到IndexedDB更新，新版本:', newVersion, '当前ref版本:', currentVersion, '部门数量:', data?.departments?.length || 0);

            // 只有当新版本大于当前版本时才更新
            if (newVersion > currentVersion) {
              console.log('[OrganizationSettings] IndexedDB版本更新，接受新数据');
              setOrgStructure(data);
              // 同步到 localStorage（带错误处理）
              try {
                localStorage.setItem('org_structure', JSON.stringify(data));
              } catch (error) {
                console.warn('[OrganizationSettings] localStorage保存失败，可能是配额已满:', error);
              }
            } else {
              console.log('[OrganizationSettings] IndexedDB版本旧于或等于当前版本，忽略更新');
            }
          });

          // 保存取消监听的函数到全局，以便组件卸载时清理
          (window as any)[INDEXEDDB_LISTENER_KEY + '_unsubscribe'] = unsubscribe;

          console.log('[OrganizationSettings] IndexedDB监听器已初始化');
        })
        .catch((error) => {
          console.warn('[OrganizationSettings] IndexedDB初始化失败，使用降级方案:', error);
          // 降级：仅使用 localStorage 和 WebSocket 同步
        });

      (window as any)[INDEXEDDB_LISTENER_KEY] = true;
    }

    window.addEventListener('storage', handleStorageChange);
    const unsubscribeWs = wsService.onMessage(messageHandler);

    return () => {
      isMounted = false;
      window.removeEventListener('storage', handleStorageChange);
      unsubscribeWs?.();
      unsubscribeBroadcast?.();
      // 注意：IndexedDB 监听器是全局的，不需要在组件卸载时清理
    };
  }, []);

  // 处理节点选择
  const handleNodeSelect = (nodeId: string, nodeType: OrgLevelType) => {
    setSelectedNodeId(nodeId);
    setNodeType(nodeType);
  };

  // 处理树节点编辑
  const handleTreeNodeEdit = (nodeId: string, nodeType: OrgLevelType) => {
    setEditingNodeInfo({ nodeId, nodeType });
    setSelectedNodeId(nodeId);
    setNodeType(nodeType);
    setDialogOpen('edit');
  };

  // 处理树节点删除
  const handleTreeNodeDelete = async (nodeId: string, nodeType: OrgLevelType) => {
    const typeLabel = nodeType === 'department' ? '部门' : nodeType === 'tech_group' ? '技术组' : '成员';
    const confirmed = await dialog.confirm(`确定要删除这个${typeLabel}吗？`, {
      title: '确认删除',
      variant: 'danger'
    });

    if (confirmed) {
      // 直接调用删除逻辑
      const result = await deleteNode(nodeId);
      if (result.success) {
        // 删除成功，刷新组织架构数据
        const org = await getOrganization();
        setOrgStructure(org);
        setSelectedNodeId(null);
        setNodeType(null);
      } else {
        // 显示失败消息
        await dialog.alert(result.message || '删除失败', {
          title: '操作失败',
          variant: 'error'
        });
      }
    }
  };

  // 处理重置密码
  const handleNodeResetPassword = async (nodeId: string, employeeId: string, name: string) => {
    // 生成安全的随机密码（12位，包含大小写字母、数字和特殊字符）
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    const array = new Uint32Array(12);
    crypto.getRandomValues(array);
    let newPassword = '';
    for (let i = 0; i < 12; i++) {
      newPassword += chars.charAt(array[i] % chars.length);
    }

    const confirmed = await dialog.confirm(
      `确定要重置用户 "${name}"（${employeeId}）的密码吗？\n\n新密码：${newPassword}\n\n请记录新密码，确定后将无法恢复。`,
      {
        title: '重置密码',
        variant: 'warning'
      }
    );

    if (confirmed) {
      try {
        const USERS_STORAGE_KEY = 'app_users';
        const usersData = localStorage.getItem(USERS_STORAGE_KEY);
        const users = usersData ? JSON.parse(usersData) : {};

        if (users[employeeId]) {
          users[employeeId].password = newPassword;
          localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
          await dialog.alert(`密码已重置为：${newPassword}`, {
            title: '重置成功',
            variant: 'success'
          });
        } else {
          await dialog.alert('用户不存在，请检查工号是否正确', {
            title: '操作失败',
            variant: 'error'
          });
        }
      } catch (error) {
        console.error('[OrganizationSettings] 重置密码失败:', error);
        await dialog.alert('重置密码失败，请重试', {
          title: '操作失败',
          variant: 'error'
        });
      }
    }
  };

  // 处理导入成功
  const handleImportSuccess = async (org: OrganizationStructure) => {
    await saveOrganization(org);  // 等待保存完成（包括后端、WebSocket、IndexedDB）
    setOrgStructure(org);
    setSelectedNodeId(null);
    setNodeType(null);
    setDialogOpen(null);
  };

  // 处理创建组织成功
  const handleCreateSuccess = async (org: OrganizationStructure) => {
    await saveOrganization(org);  // 等待保存完成
    setOrgStructure(org);
    setDialogOpen(null);
  };

  // 处理删除组织
  const handleDeleteOrganization = async () => {
    const confirmed = await dialog.confirm('确定要删除整个组织架构吗？此操作不可恢复。', {
      title: '确认删除',
      variant: 'danger'
    });

    if (confirmed) {
      clearOrganization();
      setOrgStructure(null);
      setSelectedNodeId(null);
      setNodeType(null);

      // 通知其他浏览器/标签页
      try {
        const wsService = WebSocketService.getInstance();
        if (wsService && wsService.isConnected()) {
          wsService.send({
            type: 'global_data_update',
            data: {
              dataType: 'organization_units',
              dataId: 'default',
              data: null,
              version: 0,
              timestamp: Date.now()
            }
          });
        }
      } catch (error) {
        console.warn('[OrganizationSettings] WebSocket通知失败:', error);
      }
    }
  };

  // 处理节点更新
  const handleNodeUpdate = async () => {
    const org = await getOrganization();
    setOrgStructure(org);
  };

  // 处理节点删除
  const handleNodeDelete = async () => {
    const org = await getOrganization();
    setOrgStructure(org);
    setSelectedNodeId(null);
    setNodeType(null);
  };

  // 获取统计信息（仅在组织架构存在时计算）
  // Bug-P1-007修复：使用Set去重统计部门数量（递归统计）
  const stats = orgStructure ? (() => {
    // 递归统计所有部门（使用Set去重）
    const countAllDepartments = (nodes: typeof orgStructure.departments): number => {
      const deptIds = new Set<string>();
      const collectDepts = (deptList: typeof orgStructure.departments) => {
        if (!deptList) return;
        deptList.forEach(dept => {
          deptIds.add(dept.id);
          // 递归统计子部门
          const subDepts = dept.children?.filter(c => c.level === 'department');
          if (subDepts && subDepts.length > 0) {
            collectDepts(subDepts as any);
          }
        });
      };
      collectDepts(nodes);
      return deptIds.size;
    };

    return {
      departments: countAllDepartments(orgStructure.departments),
      techGroups: getAllTechGroups().length,
      members: getAllMembers().length
    };
  })() : { departments: 0, techGroups: 0, members: 0 };

  // 加载状态：显示加载动画
  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-400 animate-spin mx-auto mb-4" />
          <p className="text-slate-400">正在加载组织架构...</p>
        </div>
      </div>
    );
  }

  // 初始状态：显示按钮选择界面
  if (!hasOrg) {
    return (
      <DialogProvider
        confirmDialog={dialog.confirmDialog}
        inputDialog={{
          isOpen: dialog.inputDialog.isOpen,
          options: dialog.inputDialog.options,
          inputValue: dialog.inputDialog.inputValue,
          onValueChange: dialog.inputDialog.handleInputChange,
          handleConfirm: dialog.inputDialog.handleConfirm,
          handleCancel: dialog.inputDialog.handleCancel
        }}
        alertDialog={dialog.alertDialog}
      >
        <>
        <div className="h-full flex items-center justify-center p-6 overflow-auto">
          <div className="w-full max-w-4xl">
            {/* 页面标题 */}
            <div className="text-center mb-12">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center mx-auto mb-6 ring-1 ring-blue-500/30">
                <Building2 className="w-10 h-10 text-blue-400" />
              </div>
              <h1 className="text-3xl font-bold text-white mb-3">
                组织及人员设置
              </h1>
              <p className="text-slate-400 text-base max-w-lg mx-auto">
                系统中暂无组织架构数据。请创建新的组织架构或导入现有数据以开始使用。
              </p>
            </div>

            {/* 操作按钮卡片 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
              {/* 新建组织架构按钮 */}
              <button
                onClick={() => setDialogOpen('create')}
                className="group relative overflow-hidden bg-gradient-to-br from-blue-600/20 to-blue-700/20 hover:from-blue-600/30 hover:to-blue-700/30 border border-blue-500/30 hover:border-blue-500/50 rounded-2xl p-8 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-blue-500/10"
              >
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="w-16 h-16 rounded-xl bg-blue-500/20 flex items-center justify-center group-hover:bg-blue-500/30 transition-colors">
                    <Building2 className="w-8 h-8 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-2 group-hover:text-blue-300 transition-colors">
                      新建组织架构
                    </h3>
                    <p className="text-slate-400 text-sm leading-relaxed">
                      从零开始创建您的组织架构，添加部门、技术组和成员
                    </p>
                  </div>
                  <div className="w-full pt-4">
                    <div className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors group-hover:shadow-lg group-hover:shadow-blue-500/25">
                      <Plus className="w-4 h-4" />
                      <span className="font-medium">开始创建</span>
                    </div>
                  </div>
                </div>
                {/* 装饰性光晕效果 */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
              </button>

              {/* 导入组织架构按钮 */}
              <button
                onClick={() => setDialogOpen('import')}
                className="group relative overflow-hidden bg-gradient-to-br from-purple-600/20 to-purple-700/20 hover:from-purple-600/30 hover:to-purple-700/30 border border-purple-500/30 hover:border-purple-500/50 rounded-2xl p-8 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-purple-500/10"
              >
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="w-16 h-16 rounded-xl bg-purple-500/20 flex items-center justify-center group-hover:bg-purple-500/30 transition-colors">
                    <Upload className="w-8 h-8 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-2 group-hover:text-purple-300 transition-colors">
                      导入组织架构
                    </h3>
                    <p className="text-slate-400 text-sm leading-relaxed">
                      从 Excel 文件导入已有组织架构数据
                    </p>
                  </div>
                  <div className="w-full pt-4">
                    <div className="inline-flex items-center gap-2 px-6 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors group-hover:shadow-lg group-hover:shadow-purple-500/25">
                      <Upload className="w-4 h-4" />
                      <span className="font-medium">选择文件</span>
                    </div>
                  </div>
                </div>
                {/* 装饰性光晕效果 */}
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
              </button>
            </div>

            {/* 底部提示信息 */}
            <div className="mt-12 text-center">
              <div className="inline-flex items-start gap-3 bg-slate-800/50 border border-slate-700 rounded-xl p-4 max-w-lg mx-auto">
                <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <AlertCircle className="w-3 h-3 text-blue-400" />
                </div>
                <div className="text-left">
                  <p className="text-sm text-slate-300 font-medium mb-1">
                    首次使用提示
                  </p>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    建议先导入现有组织架构数据。如果是首次使用，也可以选择手动创建，系统将引导您完成部门和人员配置。
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 创建组织架构对话框 */}
        <CreateOrganizationDialog
          isOpen={dialogOpen === 'create'}
          onClose={() => setDialogOpen(null)}
          onSuccess={handleCreateSuccess}
          userId={user?.username}
        />

        {/* 导入对话框 */}
        <ImportExportDialog
          mode="import"
          isOpen={dialogOpen === 'import'}
          onClose={() => setDialogOpen(null)}
          onImport={handleImportSuccess}
        />
      </>
      </DialogProvider>
    );
  }

  // 有数据时显示完整界面
  return (
    <DialogProvider
      confirmDialog={dialog.confirmDialog}
      inputDialog={{
        isOpen: dialog.inputDialog.isOpen,
        options: dialog.inputDialog.options,
        inputValue: dialog.inputDialog.inputValue,
        onValueChange: dialog.inputDialog.handleInputChange,
        handleConfirm: dialog.inputDialog.handleConfirm,
        handleCancel: dialog.inputDialog.handleCancel
      }}
      alertDialog={dialog.alertDialog}
    >
      <div className="h-full flex flex-col p-6 space-y-4">
      {/* 工具栏 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-semibold text-white">组织及人员设置</h1>
          <div className="flex gap-4 text-sm text-slate-400">
            <span>部门: {stats.departments}</span>
            <span>技术组: {stats.techGroups}</span>
            <span>成员: {stats.members}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setDialogOpen('import')}
            size="sm"
            variant="outline"
            className="border-slate-600 text-slate-300 hover:text-white hover:bg-slate-700"
          >
            <Upload className="w-4 h-4 mr-2" />
            导入
          </Button>
          <Button
            onClick={() => {
              if (orgStructure) downloadOrganizationExcel(orgStructure);
            }}
            size="sm"
            variant="outline"
            className="border-slate-600 text-slate-300 hover:text-white hover:bg-slate-700"
          >
            <Download className="w-4 h-4 mr-2" />
            导出
          </Button>
          <Button
            onClick={() => setDialogOpen('capability')}
            size="sm"
            variant="outline"
            className="border-slate-600 text-slate-300 hover:text-white hover:bg-slate-700"
            title="设置工程师评估标准和能力维度"
          >
            <Settings className="w-4 h-4 mr-2" />
            能力模型设置
          </Button>
          {canEdit && (
            <Button
              onClick={handleDeleteOrganization}
              size="sm"
              variant="outline"
              className="border-red-600 text-red-400 hover:text-red-300 hover:bg-red-900/30"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              删除组织
            </Button>
          )}
        </div>
      </div>

      {/* 主内容区域 */}
      <div className="flex-1 flex gap-4 min-h-0">
        {/* 左侧：树形结构 */}
        <Card className="bg-card border-border flex-1 min-w-[400px] max-w-[600px] overflow-hidden">
          <div className="h-full p-4 overflow-auto">
            {orgStructure && orgStructure.departments && (
              <OrganizationTree
                departments={orgStructure.departments}
                selectedNodeId={selectedNodeId}
                onNodeSelect={handleNodeSelect}
                onNodeEdit={handleTreeNodeEdit}
                onNodeDelete={handleTreeNodeDelete}
                onNodeResetPassword={handleNodeResetPassword}
                readOnly={!canEdit}
              />
            )}
          </div>
        </Card>

        {/* 右侧：详情面板 */}
        <Card className="bg-card border-border flex-1 min-w-[350px] max-w-[550px] overflow-hidden">
          <div className="h-full overflow-auto">
            {selectedNodeId ? (
              <OrganizationDetailPanelWithDialogs
                selectedNodeId={selectedNodeId}
                selectedNodeType={selectedNodeType}
                orgStructure={orgStructure}
                onNodeUpdate={handleNodeUpdate}
                onNodeDelete={handleNodeDelete}
                readOnly={!canEdit}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400">
                <div className="text-center">
                  <Building2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>请选择左侧节点查看详情</p>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* 导入导出对话框 */}
      <ImportExportDialog
        mode="import"
        isOpen={dialogOpen === 'import'}
        onClose={() => setDialogOpen(null)}
        onImport={handleImportSuccess}
      />

      {/* 能力模型设置对话框 */}
      <CapabilityModelSettings
        isOpen={dialogOpen === 'capability'}
        onClose={() => setDialogOpen(null)}
        orgStructure={orgStructure}
      />
      </div>
    </DialogProvider>
  );
}
