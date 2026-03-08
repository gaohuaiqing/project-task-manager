/**
 * 日期输入框组件 - 支持深色主题
 *
 * 解决浏览器原生日期选择器在深色主题下图标不明显的问题
 */

import * as React from "react"
import { Input } from "@/components/ui/input"
import { Calendar } from "lucide-react"
import { cn } from "@/lib/utils"

export interface DateInputProps extends Omit<React.ComponentProps<"input">, "type"> {
  /** 是否显示自定义日历图标 */
  showIcon?: boolean
}

function DateInput({ className, showIcon = true, ...props }: DateInputProps) {
  const inputRef = React.useRef<HTMLInputElement>(null)

  // 强制设置深色主题下的日历图标颜色
  React.useEffect(() => {
    const input = inputRef.current
    if (!input) return

    // 检测是否在深色主题下
    const isDark = document.documentElement.classList.contains('dark')
    if (!isDark) return

    // 尝试通过样式直接设置图标颜色
    const styleId = 'date-input-icon-fix'
    let styleEl = document.getElementById(styleId) as HTMLStyleElement

    if (!styleEl) {
      styleEl = document.createElement('style')
      styleEl.id = styleId
      styleEl.textContent = `
        /* 强制设置深色主题下的日历图标颜色 */
        .dark input[type="date"]::-webkit-calendar-picker-indicator {
          filter: brightness(0) invert(1) !important;
          opacity: 1 !important;
        }
        .dark input[type="date"]::-moz-calendar-picker-indicator {
          filter: brightness(0) invert(1) !important;
          opacity: 1 !important;
        }
      `
      document.head.appendChild(styleEl)
    }

    // 直接操作输入元素的样式
    const updateIconColor = () => {
      const indicator = (input as any).webkitEntries?.[0] as HTMLElement
      if (indicator) {
        indicator.style.filter = 'brightness(0) invert(1)'
        indicator.style.opacity = '1'
      }
    }

    // 初始设置
    updateIconColor()

    // 监听变化
    input.addEventListener('focus', updateIconColor)
    input.addEventListener('mouseenter', updateIconColor)

    return () => {
      input.removeEventListener('focus', updateIconColor)
      input.removeEventListener('mouseenter', updateIconColor)
    }
  }, [])

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        type="date"
        data-slot="date-input"
        className={cn(
          "pr-10", // 为图标留出空间
          "[&::-webkit-calendar-picker-indicator]:cursor-pointer",
          "[&::-webkit-calendar-picker-indicator]:opacity-100",
          className
        )}
        {...props}
      />
      {/* 可选：显示自定义的日历图标（仅视觉提示，实际点击还是触发原生日期选择器） */}
      {showIcon && (
        <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
      )}
    </div>
  )
}

export { DateInput }
