/**
 * 设计系统演示组件
 * 展示苹果风格设计系统的实际应用效果
 */

import React, { useState } from 'react';
import { AppleButton } from './AppleButton';
import { AppleCard, AppleCardGroup } from './AppleCard';
import { AppleInput, AppleTextarea } from './AppleInput';

export const DesignSystemDemo: React.FC = () => {
  const [inputValue, setInputValue] = useState('');
  const [textareaValue, setTextareaValue] = useState('');
  const [hasError, setHasError] = useState(false);

  return (
    <div style={{
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '40px 20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", sans-serif',
    }}>
      {/* 页面标题 */}
      <div style={{ marginBottom: '40px' }}>
        <h1 style={{
          fontSize: '32px',
          fontWeight: '700',
          lineHeight: '40px',
          letterSpacing: '-0.02em',
          color: 'inherit',
          margin: '0 0 12px 0',
        }}>
          苹果风格设计系统演示
        </h1>
        <p style={{
          fontSize: '16px',
          lineHeight: '24px',
          color: 'hsl(var(--muted-foreground))',
          margin: '0',
        }}>
          展示基于 Apple Human Interface Guidelines 的设计令牌和组件
        </p>
      </div>

      {/* 按钮演示 */}
      <AppleCard
        title="按钮组件"
        subtitle="Button Components"
        elevated
        style={{ marginBottom: '24px' }}
      >
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          alignItems: 'center',
        }}>
          <AppleButton variant="primary">主要按钮</AppleButton>
          <AppleButton variant="secondary">次要按钮</AppleButton>
          <AppleButton variant="success">成功</AppleButton>
          <AppleButton variant="warning">警告</AppleButton>
          <AppleButton variant="danger">危险</AppleButton>
          <AppleButton loading>加载中...</AppleButton>
          <AppleButton disabled>禁用</AppleButton>
        </div>

        <div style={{
          marginTop: '20px',
          paddingTop: '20px',
          borderTop: '1px solid hsl(var(--border))',
        }}>
          <p style={{
            fontSize: '14px',
            color: 'hsl(var(--muted-foreground))',
            margin: '0 0 12px 0',
          }}>
            不同尺寸：
          </p>
          <div style={{
            display: 'flex',
            gap: '12px',
            alignItems: 'center',
          }}>
            <AppleButton size="small">小按钮</AppleButton>
            <AppleButton size="medium">中按钮</AppleButton>
            <AppleButton size="large">大按钮</AppleButton>
          </div>
        </div>
      </AppleCard>

      {/* 卡片演示 */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{
          fontSize: '24px',
          fontWeight: '600',
          lineHeight: '32px',
          letterSpacing: '-0.01em',
          color: 'inherit',
          margin: '0 0 16px 0',
        }}>
          卡片组件
        </h2>

        <AppleCardGroup gap="medium" equalHeight>
          <AppleCard
            title="标准卡片"
            subtitle="Card Components"
          >
            这是一个标准的卡片组件，使用设计令牌中定义的圆角、间距和阴影。
          </AppleCard>

          <AppleCard
            title="浮起卡片"
            subtitle="Elevated Card"
            elevated
          >
            这个卡片使用了浮起效果，具有更明显的阴影，适合突出重要内容。
          </AppleCard>

          <AppleCard
            title="交互卡片"
            subtitle="Interactive Card"
            elevated
            hoverable
            onClick={() => console.log('Card clicked')}
            actions={<AppleButton size="small">操作</AppleButton>}
          >
            这个卡片支持悬停和点击交互，适合作为可点击的内容容器。
          </AppleCard>
        </AppleCardGroup>
      </div>

      {/* 输入框演示 */}
      <AppleCard
        title="输入框组件"
        subtitle="Input Components"
        elevated
        style={{ marginBottom: '24px' }}
      >
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '20px',
        }}>
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

          <AppleTextarea
            label="描述"
            placeholder="请输入详细描述..."
            minRows={3}
            maxRows={6}
            value={textareaValue}
            onChange={(e) => setTextareaValue(e.target.value)}
            helperText="最多500个字符"
          />
        </div>
      </AppleCard>

      {/* 颜色系统演示 */}
      <AppleCard
        title="颜色系统"
        subtitle="Color System"
        elevated
        style={{ marginBottom: '24px' }}
      >
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
          gap: '12px',
        }}>
          {[
            { name: 'Blue', color: 'hsl(211, 98%, 52%)' },
            { name: 'Green', color: 'hsl(142, 69%, 58%)' },
            { name: 'Orange', color: 'hsl(28, 93%, 62%)' },
            { name: 'Red', color: 'hsl(0, 84%, 60%)' },
            { name: 'Yellow', color: 'hsl(48, 98%, 60%)' },
            { name: 'Pink', color: 'hsl(340, 82%, 66%)' },
          ].map(({ name, color }) => (
            <div
              key={name}
              style={{
                padding: '16px',
                borderRadius: '12px',
                backgroundColor: color,
                color: '#ffffff',
                textAlign: 'center',
                fontWeight: '600',
                fontSize: '14px',
              }}
            >
              {name}
            </div>
          ))}
        </div>
      </AppleCard>

      {/* 动画演示 */}
      <AppleCard
        title="动画效果"
        subtitle="Animation Effects"
        elevated
      >
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '16px',
        }}>
          <AppleButton
            onMouseEnter={(e) => {
              e.currentTarget.style.animation = 'spring-scale 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)';
            }}
            onAnimationEnd={(e) => {
              e.currentTarget.style.animation = '';
            }}
          >
            弹性动画
          </AppleButton>

          <AppleButton
            variant="secondary"
            onMouseEnter={(e) => {
              e.currentTarget.style.animation = 'fade-in 0.3s cubic-bezier(0.33, 1, 0.68, 1)';
            }}
            onAnimationEnd={(e) => {
              e.currentTarget.style.animation = '';
            }}
          >
            淡入动画
          </AppleButton>

          <AppleButton
            variant="success"
            onMouseEnter={(e) => {
              e.currentTarget.style.animation = 'slide-up-fade-in 0.3s cubic-bezier(0.33, 1, 0.68, 1)';
            }}
            onAnimationEnd={(e) => {
              e.currentTarget.style.animation = '';
            }}
          >
            滑入动画
          </AppleButton>
        </div>
      </AppleCard>
    </div>
  );
};

export default DesignSystemDemo;
