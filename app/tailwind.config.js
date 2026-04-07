/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      // 苹果风格字体系统
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"SF Pro Display"',
          '"SF Pro Text"',
          '"Inter"',
          '"Segoe UI"',
          '"Roboto"',
          '"Helvetica Neue"',
          'Arial',
          'sans-serif',
        ],
        display: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"SF Pro Display"',
          '"Inter"',
          '"Segoe UI"',
          'sans-serif',
        ],
        body: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"SF Pro Text"',
          '"Inter"',
          '"Segoe UI"',
          'sans-serif',
        ],
        mono: [
          '"SF Mono"',
          '"Monaco"',
          '"Cascadia Code"',
          '"Roboto Mono"',
          'monospace',
        ],
      },
      fontSize: {
        // 苹果风格字体大小
        'apple-caption': ['12px', { lineHeight: '16px', letterSpacing: '0', fontWeight: '400' }],
        'apple-footnote': ['13px', { lineHeight: '18px', letterSpacing: '-0.01em', fontWeight: '400' }],
        'apple-subheadline': ['15px', { lineHeight: '20px', letterSpacing: '-0.015em', fontWeight: '400' }],
        'apple-callout': ['16px', { lineHeight: '21px', letterSpacing: '-0.02em', fontWeight: '400' }],
        'apple-body': ['17px', { lineHeight: '22px', letterSpacing: '-0.022em', fontWeight: '400' }],
        'apple-headline': ['17px', { lineHeight: '22px', letterSpacing: '-0.022em', fontWeight: '600' }],
        'apple-title3': ['20px', { lineHeight: '25px', letterSpacing: '0', fontWeight: '600' }],
        'apple-title2': ['22px', { lineHeight: '28px', letterSpacing: '0', fontWeight: '600' }],
        'apple-title1': ['28px', { lineHeight: '34px', letterSpacing: '0.005em', fontWeight: '700' }],
        'apple-large-title': ['34px', { lineHeight: '41px', letterSpacing: '0.01em', fontWeight: '700' }],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive) / <alpha-value>)",
          foreground: "hsl(var(--destructive-foreground) / <alpha-value>)",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
          active: "hsl(var(--sidebar-active))",
          "active-foreground": "hsl(var(--sidebar-active-foreground))",
        },
        nav: {
          active: "hsl(var(--nav-active))",
          "active-foreground": "hsl(var(--nav-active-foreground))",
        },
        // 仪表板专用颜色 - 专业工具风格
        dashboard: {
          value: "hsl(var(--dashboard-value))",
          label: "hsl(var(--dashboard-label))",
          accent: "hsl(var(--dashboard-accent))",
          "card-border": "hsl(var(--dashboard-card-border))",
          success: "hsl(var(--dashboard-success))",
          warning: "hsl(var(--dashboard-warning))",
          danger: "hsl(var(--dashboard-danger))",
        },
        // 苹果风格系统颜色
        system: {
          blue: {
            light: "hsl(211, 98%, 56%)",
            DEFAULT: "hsl(211, 98%, 52%)",
            dark: "hsl(211, 100%, 50%)",
          },
          green: {
            light: "hsl(142, 71%, 63%)",
            DEFAULT: "hsl(142, 69%, 58%)",
            dark: "hsl(142, 76%, 48%)",
          },
          orange: {
            light: "hsl(28, 92%, 68%)",
            DEFAULT: "hsl(28, 93%, 62%)",
            dark: "hsl(28, 93%, 53%)",
          },
          red: {
            light: "hsl(0, 88%, 65%)",
            DEFAULT: "hsl(0, 84%, 60%)",
            dark: "hsl(0, 89%, 48%)",
          },
          yellow: {
            light: "hsl(48, 96%, 67%)",
            DEFAULT: "hsl(48, 98%, 60%)",
            dark: "hsl(48, 100%, 50%)",
          },
          pink: {
            light: "hsl(340, 82%, 72%)",
            DEFAULT: "hsl(340, 82%, 66%)",
            dark: "hsl(340, 83%, 56%)",
          },
          purple: {
            light: "hsl(266, 86%, 70%)",
            DEFAULT: "hsl(266, 88%, 62%)",
            dark: "hsl(266, 88%, 52%)",
          },
          indigo: {
            light: "hsl(239, 84%, 67%)",
            DEFAULT: "hsl(239, 84%, 62%)",
            dark: "hsl(239, 86%, 52%)",
          },
        },
      },
      borderRadius: {
        xl: "calc(var(--radius) + 4px)",
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xs: "calc(var(--radius) - 6px)",
        // 苹果风格圆角
        "apple-button": "10px",
        "apple-card": "12px",
        "apple-modal": "14px",
        "apple-sheet": "16px",
        "apple-alert": "12px",
      },
      boxShadow: {
        xs: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
        // 苹果风格阴影
        "apple-subtle": "0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04)",
        "apple-floating": "0 4px 8px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.04)",
        "apple-elevated": "0 8px 16px rgba(0, 0, 0, 0.1), 0 4px 8px rgba(0, 0, 0, 0.06)",
        "apple-prominent": "0 12px 24px rgba(0, 0, 0, 0.12), 0 6px 12px rgba(0, 0, 0, 0.08)",
        "apple-modal": "0 20px 40px rgba(0, 0, 0, 0.15), 0 8px 16px rgba(0, 0, 0, 0.1)",
        "apple-dropdown": "0 10px 20px rgba(0, 0, 0, 0.12), 0 4px 8px rgba(0, 0, 0, 0.08)",
        // 彩色阴影
        "blue-glow": "0 4px 12px rgba(0, 122, 255, 0.25)",
        "green-glow": "0 4px 12px rgba(52, 199, 89, 0.25)",
        "red-glow": "0 4px 12px rgba(255, 59, 48, 0.25)",
      },
      // 苹果风格动画时长
      transitionDuration: {
        instant: "100ms",
        fast: "200ms",
        base: "300ms",
        medium: "400ms",
        slow: "500ms",
        slower: "600ms",
        slowest: "1000ms",
      },
      // 苹果风格缓动函数
      transitionTimingFunction: {
        apple: "cubic-bezier(0.25, 0.1, 0.25, 1)",
        "apple-in": "cubic-bezier(0.32, 0, 0.67, 0)",
        "apple-out": "cubic-bezier(0.33, 1, 0.68, 1)",
        spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
        "spring-soft": "cubic-bezier(0.25, 1.25, 0.5, 1)",
        "spring-bouncy": "cubic-bezier(0.34, 1.8, 0.64, 1)",
      },
      // 苹果风格 Z-index
      zIndex: {
        base: "0",
        above: "1",
        dropdown: "100",
        sticky: "200",
        fixed: "300",
        overlay: "400",
        modal: "500",
        popover: "600",
        tooltip: "700",
        notification: "800",
        toast: "900",
      },
      // 苹果风格模糊效果
      backdropBlur: {
        "apple-subtle": "10px",
        "apple-standard": "20px",
        "apple-strong": "30px",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "caret-blink": {
          "0%,70%,100%": { opacity: "1" },
          "20%,50%": { opacity: "0" },
        },
        // 苹果风格关键帧动画
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "fade-out": {
          from: { opacity: "1" },
          to: { opacity: "0" },
        },
        "scale-fade-in": {
          from: { opacity: "0", transform: "scale(0.95)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        "scale-fade-out": {
          from: { opacity: "1", transform: "scale(1)" },
          to: { opacity: "0", transform: "scale(0.95)" },
        },
        "slide-up-fade-in": {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "slide-down-fade-out": {
          from: { opacity: "1", transform: "translateY(0)" },
          to: { opacity: "0", transform: "translateY(10px)" },
        },
        "spring-scale": {
          "0%": { transform: "scale(0.95)" },
          "50%": { transform: "scale(1.02)" },
          "100%": { transform: "scale(1)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "caret-blink": "caret-blink 1.25s ease-out infinite",
        // 苹果风格动画
        "fade-in": "fade-in 300ms apple-out",
        "fade-out": "fade-out 300ms apple-in",
        "scale-fade-in": "scale-fade-in 300ms spring",
        "scale-fade-out": "scale-fade-out 200ms ease-in",
        "slide-up-fade-in": "slide-up-fade-in 300ms apple-out",
        "slide-down-fade-out": "slide-down-fade-out 300ms apple-in",
        "spring-scale": "spring-scale 400ms spring",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
