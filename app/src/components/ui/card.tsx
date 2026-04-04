import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * 卡片组件 - SVIPS 风格
 * 特点：半透明背景、细边框(0.8px)、大圆角(16px)、多层轻阴影
 */
function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card"
      className={cn(
        // 基础样式
        "text-card-foreground flex flex-col",
        // SVIPS 风格：半透明背景、细边框、大圆角
        "bg-card/50 backdrop-blur-sm",
        "border-[0.8px] border-border/50",
        "rounded-2xl p-4",
        // 多层轻阴影
        "shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.06)]",
        className
      )}
      {...props}
    />
  )
}

/**
 * 卡片头部 - SVIPS 风格
 * 紧凑布局，移除默认边框
 */
function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "flex items-center justify-between",
        className
      )}
      {...props}
    />
  )
}

/**
 * 卡片标题 - SVIPS 风格
 * 字号适中(14px)，字重600
 */
function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn(
        "text-sm font-semibold leading-none",
        className
      )}
      {...props}
    />
  )
}

/**
 * 卡片描述 - SVIPS 风格
 * 更小的字号(12px)
 */
function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-xs text-muted-foreground", className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn("shrink-0", className)}
      {...props}
    />
  )
}

/**
 * 卡片内容 - 无默认内边距
 */
function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("", className)}
      {...props}
    />
  )
}

/**
 * 卡片底部 - SVIPS 风格
 */
function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        "flex items-center pt-4 border-t border-border/50",
        className
      )}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
}
