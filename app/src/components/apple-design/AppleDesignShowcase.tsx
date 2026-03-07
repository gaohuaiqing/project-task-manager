/**
 * 苹果风格设计系统 - 组件展示页
 * Apple Design System - Component Showcase
 *
 * 展示所有可用组件的实际效果和使用方法
 */

import React, { useState } from 'react';
import {
  AppleButton,
  AppleCard,
  AppleInput,
  AppleBadge,
  AppleAvatar,
  AppleProgress,
  AppleTable,
  AppleTabs,
  AppleModal,
  AppleDropdown,
  AppleTooltip,
} from './index';
import type { AppleTab } from './AppleTabs';
import type { AppleTableColumn } from './AppleTable';
import type { AppleDropdownItem } from './AppleDropdown';

// 示例数据
const sampleUsers = [
  { id: '1', name: '张三', email: 'zhangsan@example.com', role: '管理员', status: '在线' },
  { id: '2', name: '李四', email: 'lisi@example.com', role: '工程师', status: '离线' },
  { id: '3', name: '王五', email: 'wangwu@example.com', role: '设计师', status: '忙碌' },
];

const tableColumns: AppleTableColumn[] = [
  { key: 'name', title: '姓名', sortable: true },
  { key: 'email', title: '邮箱' },
  { key: 'role', title: '角色' },
  { key: 'status', title: '状态' },
];

const tabs: AppleTab[] = [
  {
    key: 'overview',
    label: '概览',
    content: (
      <div className="p-4">
        <h3 className="text-lg font-semibold mb-2">概览信息</h3>
        <p className="text-muted-foreground">这里是概览标签页的内容。</p>
      </div>
    ),
  },
  {
    key: 'details',
    label: '详情',
    content: (
      <div className="p-4">
        <h3 className="text-lg font-semibold mb-2">详细信息</h3>
        <p className="text-muted-foreground">这里是详情标签页的内容。</p>
      </div>
    ),
  },
  {
    key: 'settings',
    label: '设置',
    badge: 3,
    content: (
      <div className="p-4">
        <h3 className="text-lg font-semibold mb-2">设置选项</h3>
        <p className="text-muted-foreground">这里有 3 条待处理的设置项。</p>
      </div>
    ),
  },
];

const dropdownItems: AppleDropdownItem[] = [
  {
    key: 'edit',
    label: '编辑',
    onClick: () => console.log('编辑'),
  },
  {
    key: 'duplicate',
    label: '复制',
    onClick: () => console.log('复制'),
  },
  {
    key: 'divider1',
    label: '',
    divider: true,
  },
  {
    key: 'delete',
    label: '删除',
    danger: true,
    onClick: () => console.log('删除'),
  },
];

export const AppleDesignShowcase: React.FC = () => {
  const [inputValue, setInputValue] = useState('');
  const [hasError, setHasError] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [progress, setProgress] = useState(0);

  return (
    <div className="min-h-screen bg-background">
      {/* 页面头部 */}
      <header className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <h1 className="text-3xl font-bold tracking-tight">苹果风格设计系统</h1>
          <p className="text-muted-foreground mt-2">
            基于 Apple Human Interface Guidelines 的组件库展示
          </p>
        </div>
      </header>

      {/* 主要内容 */}
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">

        {/* 按钮组件 */}
        <AppleCard title="按钮组件" subtitle="AppleButton" elevated>
          <div className="space-y-4">
            {/* 变体 */}
            <div>
              <p className="text-sm font-medium mb-3">变体 (variant)</p>
              <div className="flex flex-wrap gap-3">
                <AppleButton variant="primary">主要按钮</AppleButton>
                <AppleButton variant="secondary">次要按钮</AppleButton>
                <AppleButton variant="success">成功</AppleButton>
                <AppleButton variant="warning">警告</AppleButton>
                <AppleButton variant="danger">危险</AppleButton>
              </div>
            </div>

            {/* 尺寸 */}
            <div>
              <p className="text-sm font-medium mb-3">尺寸 (size)</p>
              <div className="flex flex-wrap items-center gap-3">
                <AppleButton size="small">小按钮</AppleButton>
                <AppleButton size="medium">中按钮</AppleButton>
                <AppleButton size="large">大按钮</AppleButton>
              </div>
            </div>

            {/* 状态 */}
            <div>
              <p className="text-sm font-medium mb-3">状态</p>
              <div className="flex flex-wrap gap-3">
                <AppleButton loading>加载中...</AppleButton>
                <AppleButton disabled>禁用按钮</AppleButton>
              </div>
            </div>
          </div>
        </AppleCard>

        {/* 徽章组件 */}
        <AppleCard title="徽章组件" subtitle="AppleBadge" elevated>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-3">文本徽章</p>
              <div className="flex flex-wrap gap-3">
                <AppleBadge>默认</AppleBadge>
                <AppleBadge variant="primary">主要</AppleBadge>
                <AppleBadge variant="success">成功</AppleBadge>
                <AppleBadge variant="warning">警告</AppleBadge>
                <AppleBadge variant="danger">危险</AppleBadge>
                <AppleBadge variant="info">信息</AppleBadge>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium mb-3">圆点徽章</p>
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <AppleBadge variant="success" dot />
                  <span className="text-sm">在线</span>
                </div>
                <div className="flex items-center gap-2">
                  <AppleBadge variant="warning" dot />
                  <span className="text-sm">离开</span>
                </div>
                <div className="flex items-center gap-2">
                  <AppleBadge variant="danger" dot />
                  <span className="text-sm">忙碌</span>
                </div>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium mb-3">计数徽章</p>
              <div className="flex flex-wrap gap-3">
                <AppleBadge count={5} />
                <AppleBadge count={99} />
                <AppleBadge count={100} maxCount={99} />
                <AppleBadge variant="danger" count={3} />
              </div>
            </div>
          </div>
        </AppleCard>

        {/* 头像组件 */}
        <AppleCard title="头像组件" subtitle="AppleAvatar" elevated>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-3">尺寸</p>
              <div className="flex flex-wrap items-center gap-4">
                <AppleAvatar alt="张" size="xsmall" />
                <AppleAvatar alt="李" size="small" />
                <AppleAvatar alt="王" size="medium" />
                <AppleAvatar alt="赵" size="large" />
                <AppleAvatar alt="钱" size="xlarge" />
              </div>
            </div>

            <div>
              <p className="text-sm font-medium mb-3">状态</p>
              <div className="flex flex-wrap items-center gap-4">
                <AppleAvatar alt="张三" size="large" status="online" />
                <AppleAvatar alt="李四" size="large" status="offline" />
                <AppleAvatar alt="王五" size="large" status="away" />
                <AppleAvatar alt="赵六" size="large" status="busy" />
              </div>
            </div>

            <div>
              <p className="text-sm font-medium mb-3">图片头像</p>
              <div className="flex flex-wrap items-center gap-4">
                <AppleAvatar
                  src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix"
                  alt="用户1"
                  size="large"
                  status="online"
                  clickable
                  onClick={() => console.log('点击头像')}
                />
                <AppleAvatar
                  src="https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka"
                  alt="用户2"
                  size="large"
                  clickable
                  onClick={() => console.log('点击头像')}
                />
              </div>
            </div>
          </div>
        </AppleCard>

        {/* 进度条组件 */}
        <AppleCard title="进度条组件" subtitle="AppleProgress" elevated>
          <div className="space-y-6">
            <div>
              <p className="text-sm font-medium mb-3">线性进度条</p>
              <div className="space-y-3">
                <AppleProgress percent={30} />
                <AppleProgress percent={50} status="active" />
                <AppleProgress percent={75} status="success" showInfo={false} />
                <AppleProgress percent={90} status="exception" />
              </div>
            </div>

            <div>
              <p className="text-sm font-medium mb-3">圆形进度条</p>
              <div className="flex flex-wrap items-center gap-6">
                <AppleProgress percent={30} type="circular" size="small" />
                <AppleProgress percent={50} type="circular" size="medium" />
                <AppleProgress percent={75} type="circular" size="large" status="success" />
                <AppleProgress percent={90} type="circular" size="large" status="exception" />
              </div>
            </div>

            <div>
              <p className="text-sm font-medium mb-3">动态进度演示</p>
              <div className="space-y-4">
                <AppleProgress percent={progress} status="active" />
                <div className="flex gap-2">
                  <AppleButton size="small" onClick={() => setProgress(0)}>
                    重置
                  </AppleButton>
                  <AppleButton size="small" onClick={() => setProgress(Math.min(100, progress + 10))}>
                    增加
                  </AppleButton>
                  <AppleButton
                    size="small"
                    onClick={() => {
                      setProgress(0);
                      const interval = setInterval(() => {
                        setProgress((prev) => {
                          if (prev >= 100) {
                            clearInterval(interval);
                            return 100;
                          }
                          return prev + 1;
                        });
                      }, 50);
                    }}
                  >
                    自动加载
                  </AppleButton>
                </div>
              </div>
            </div>
          </div>
        </AppleCard>

        {/* 表格组件 */}
        <AppleCard title="表格组件" subtitle="AppleTable" elevated>
          <AppleTable
            columns={tableColumns}
            dataSource={sampleUsers}
            rowKey="id"
            striped
            hoverable
            onRowClick={(record) => console.log('点击行:', record)}
          />
        </AppleCard>

        {/* 标签页组件 */}
        <AppleCard title="标签页组件" subtitle="AppleTabs" elevated>
          <div className="space-y-4">
            <AppleTabs tabs={tabs} defaultActiveKey="overview" variant="line" />
          </div>
        </AppleCard>

        {/* 输入框组件 */}
        <AppleCard title="输入框组件" subtitle="AppleInput" elevated>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <AppleInput
              label="用户名"
              placeholder="请输入用户名"
              required
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                setHasError(e.target.value.length === 0);
              }}
              error={hasError}
              errorText="用户名不能为空"
              helperText="用于登录的用户名，至少3个字符"
            />

            <AppleInput
              label="邮箱"
              type="email"
              placeholder="example@email.com"
              helperText="我们将向此邮箱发送验证链接"
            />

            <AppleInput
              label="密码"
              type="password"
              placeholder="请输入密码"
              required
              helperText="至少包含8个字符"
            />
          </div>
        </AppleCard>

        {/* 下拉菜单组件 */}
        <AppleCard title="下拉菜单组件" subtitle="AppleDropdown" elevated>
          <div className="flex flex-wrap gap-4">
            <AppleDropdown
              trigger={<AppleButton variant="secondary">操作菜单</AppleButton>}
              items={dropdownItems}
            />
            <AppleDropdown
              trigger={<AppleButton variant="secondary">右对齐</AppleButton>}
              items={dropdownItems}
              align="end"
            />
          </div>
        </AppleCard>

        {/* 工具提示组件 */}
        <AppleCard title="工具提示组件" subtitle="AppleTooltip" elevated>
          <div className="flex flex-wrap items-center gap-4">
            <AppleTooltip content="这是顶部提示" placement="top">
              <AppleButton variant="secondary" size="small">顶部</AppleButton>
            </AppleTooltip>

            <AppleTooltip content="这是底部提示" placement="bottom">
              <AppleButton variant="secondary" size="small">底部</AppleButton>
            </AppleTooltip>

            <AppleTooltip content="这是左侧提示" placement="left">
              <AppleButton variant="secondary" size="small">左侧</AppleButton>
            </AppleTooltip>

            <AppleTooltip content="这是右侧提示" placement="right">
              <AppleButton variant="secondary" size="small">右侧</AppleButton>
            </AppleTooltip>

            <AppleTooltip
              content="这是一个很长的提示文本，用于测试工具提示的显示效果。"
              placement="top"
            >
              <AppleButton variant="secondary" size="small">长文本</AppleButton>
            </AppleTooltip>
          </div>
        </AppleCard>

        {/* 模态框组件 */}
        <AppleCard title="模态框组件" subtitle="AppleModal" elevated>
          <AppleButton
            variant="primary"
            onClick={() => setModalOpen(true)}
          >
            打开模态框
          </AppleButton>

          <AppleModal
            open={modalOpen}
            onClose={() => setModalOpen(false)}
            title="创建项目"
            size="medium"
            footer={
              <>
                <AppleButton variant="secondary" onClick={() => setModalOpen(false)}>
                  取消
                </AppleButton>
                <AppleButton variant="primary" onClick={() => setModalOpen(false)}>
                  确认创建
                </AppleButton>
              </>
            }
          >
            <div className="space-y-4">
              <p>这是模态框的内容区域。您可以在这里放置表单、信息或其他内容。</p>
              <AppleInput
                label="项目名称"
                placeholder="请输入项目名称"
                required
              />
              <AppleInput
                label="项目描述"
                placeholder="请输入项目描述"
              />
            </div>
          </AppleModal>
        </AppleCard>

        {/* 卡片组示例 */}
        <div>
          <h2 className="text-2xl font-bold mb-4">卡片组示例</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <AppleCard
              title="标准卡片"
              subtitle="Card Components"
            >
              <p className="text-muted-foreground">
                这是一个标准的卡片组件，使用设计令牌中定义的圆角、间距和阴影。
              </p>
            </AppleCard>

            <AppleCard
              title="浮起卡片"
              subtitle="Elevated Card"
              elevated
            >
              <p className="text-muted-foreground">
                这个卡片使用了浮起效果，具有更明显的阴影，适合突出重要内容。
              </p>
            </AppleCard>

            <AppleCard
              title="交互卡片"
              subtitle="Interactive Card"
              elevated
              hoverable
              onClick={() => console.log('Card clicked')}
            >
              <p className="text-muted-foreground">
                这个卡片支持悬停和点击交互，适合作为可点击的内容容器。
              </p>
              <div className="mt-4">
                <AppleButton size="small">查看详情</AppleButton>
              </div>
            </AppleCard>
          </div>
        </div>

      </main>

      {/* 页脚 */}
      <footer className="border-t border-border mt-12">
        <div className="max-w-7xl mx-auto px-6 py-6 text-center text-sm text-muted-foreground">
          <p>苹果风格设计系统 v1.0 · 基于 Apple Human Interface Guidelines</p>
        </div>
      </footer>
    </div>
  );
};

export default AppleDesignShowcase;
