"use client"

import * as React from "react"
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "lucide-react"
import {
  DayPicker,
  getDefaultClassNames,
  type DayButton,
  useDayPicker,
} from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// 月份选择器组件
function MonthYearSelector({
  displayMonth,
  onMonthChange,
  onYearChange,
}: {
  displayMonth: Date | undefined
  onMonthChange: (month: number) => void
  onYearChange: (year: number) => void
}) {
  const months = [
    "1月", "2月", "3月", "4月", "5月", "6月",
    "7月", "8月", "9月", "10月", "11月", "12月"
  ]

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 21 }, (_, i) => currentYear - 10 + i)

  // 如果 displayMonth 未定义，使用当前日期
  const safeDate = displayMonth || new Date()
  const currentMonth = safeDate.getMonth()
  const currentYearValue = safeDate.getFullYear()

  return (
    <div className="flex items-center gap-2">
      <Select
        value={currentMonth.toString()}
        onValueChange={(value) => onMonthChange(parseInt(value))}
      >
        <SelectTrigger className="w-[80px] h-9 bg-secondary border-border text-foreground text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-popover border-border max-h-[200px]">
          {months.map((month, index) => (
            <SelectItem
              key={index}
              value={index.toString()}
              className="text-foreground hover:bg-accent focus:bg-accent cursor-pointer"
            >
              {month}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={currentYearValue.toString()}
        onValueChange={(value) => onYearChange(parseInt(value))}
      >
        <SelectTrigger className="w-[100px] h-9 bg-secondary border-border text-foreground text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-popover border-border max-h-[200px]">
          {years.map((year) => (
            <SelectItem
              key={year}
              value={year.toString()}
              className="text-foreground hover:bg-accent focus:bg-accent cursor-pointer"
            >
              {year}年
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

// 自定义导航组件
function CustomNav({
  onPreviousClick,
  onNextClick,
  previousMonth,
  nextMonth,
}: {
  onPreviousClick: () => void
  onNextClick: () => void
  previousMonth?: Date
  nextMonth?: Date
}) {
  const dayPickerContext = useDayPicker()

  // react-day-picker v9: 使用 months[0].date 获取当前显示月份
  const displayMonth = dayPickerContext.months[0]?.date
  const goToMonth = dayPickerContext.goToMonth

  const handleMonthChange = (month: number) => {
    if (!displayMonth || !goToMonth) return
    const newDate = new Date(displayMonth)
    newDate.setMonth(month)
    goToMonth(newDate)
  }

  const handleYearChange = (year: number) => {
    if (!displayMonth || !goToMonth) return
    const newDate = new Date(displayMonth)
    newDate.setFullYear(year)
    goToMonth(newDate)
  }

  return (
    <div className="flex items-center justify-between w-full px-2 py-2">
      {/* 上一个月按钮 */}
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9 text-foreground hover:text-accent-foreground hover:bg-accent flex-shrink-0"
        onClick={onPreviousClick}
        disabled={!previousMonth}
      >
        <ChevronLeftIcon className="h-5 w-5" />
      </Button>

      {/* 月份和年份选择器 */}
      <MonthYearSelector
        displayMonth={displayMonth}
        onMonthChange={handleMonthChange}
        onYearChange={handleYearChange}
      />

      {/* 下一个月按钮 */}
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9 text-foreground hover:text-accent-foreground hover:bg-accent flex-shrink-0"
        onClick={onNextClick}
        disabled={!nextMonth}
      >
        <ChevronRightIcon className="h-5 w-5" />
      </Button>
    </div>
  )
}

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = "label",
  buttonVariant = "ghost",
  formatters,
  components,
  ...props
}: React.ComponentProps<typeof DayPicker> & {
  buttonVariant?: React.ComponentProps<typeof Button>["variant"]
}) {
  const defaultClassNames = getDefaultClassNames()

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn(
        "bg-background group/calendar p-3 [--cell-size:--spacing(8)] [[data-slot=card-content]_&]:bg-transparent [[data-slot=popover-content]_&]:bg-transparent",
        String.raw`rtl:**:[.rdp-button_next>svg]:rotate-180`,
        String.raw`rtl:**:[.rdp-button_previous>svg]:rotate-180`,
        className
      )}
      captionLayout={captionLayout}
      formatters={{
        formatMonthDropdown: (date) =>
          date.toLocaleString("default", { month: "short" }),
        ...formatters,
      }}
      classNames={{
        root: cn("w-fit", defaultClassNames.root),
        months: cn(
          "flex gap-4 flex-col md:flex-row relative",
          defaultClassNames.months
        ),
        month: cn("flex flex-col w-full gap-2", defaultClassNames.month),
        nav: cn(
          "hidden",
          defaultClassNames.nav
        ),
        button_previous: cn(
          buttonVariants({ variant: buttonVariant }),
          "h-9 w-9 aria-disabled:opacity-50 p-0 select-none flex-shrink-0",
          defaultClassNames.button_previous
        ),
        button_next: cn(
          buttonVariants({ variant: buttonVariant }),
          "h-9 w-9 aria-disabled:opacity-50 p-0 select-none flex-shrink-0",
          defaultClassNames.button_next
        ),
        month_caption: cn(
          "hidden",
          defaultClassNames.month_caption
        ),
        dropdowns: cn(
          "hidden",
          defaultClassNames.dropdowns
        ),
        dropdown_root: cn(
          "hidden",
          defaultClassNames.dropdown_root
        ),
        dropdown: cn(
          "hidden",
          defaultClassNames.dropdown
        ),
        caption_label: cn(
          "hidden",
          defaultClassNames.caption_label
        ),
        table: "w-full border-collapse",
        weekdays: cn("flex", defaultClassNames.weekdays),
        weekday: cn(
          "text-muted-foreground rounded-md flex-1 font-normal text-[0.8rem] select-none",
          defaultClassNames.weekday
        ),
        week: cn("flex w-full mt-2", defaultClassNames.week),
        week_number_header: cn(
          "select-none w-(--cell-size)",
          defaultClassNames.week_number_header
        ),
        week_number: cn(
          "text-[0.8rem] select-none text-muted-foreground",
          defaultClassNames.week_number
        ),
        day: cn(
          "relative w-full h-full p-0 text-center [&:last-child[data-selected=true]_button]:rounded-r-md group/day aspect-square select-none",
          props.showWeekNumber
            ? "[&:nth-child(2)[data-selected=true]_button]:rounded-l-md"
            : "[&:first-child[data-selected=true]_button]:rounded-l-md",
          defaultClassNames.day
        ),
        range_start: cn(
          "rounded-l-md bg-accent",
          defaultClassNames.range_start
        ),
        range_middle: cn("rounded-none", defaultClassNames.range_middle),
        range_end: cn("rounded-r-md bg-accent", defaultClassNames.range_end),
        today: cn(
          "bg-accent text-accent-foreground rounded-md data-[selected=true]:rounded-none",
          defaultClassNames.today
        ),
        outside: cn(
          "text-muted-foreground aria-selected:text-muted-foreground",
          defaultClassNames.outside
        ),
        disabled: cn(
          "text-muted-foreground opacity-50",
          defaultClassNames.disabled
        ),
        hidden: cn("invisible", defaultClassNames.hidden),
        ...classNames,
      }}
      components={{
        Root: ({ className, rootRef, ...props }) => {
          return (
            <div
              data-slot="calendar"
              ref={rootRef}
              className={cn(className)}
              {...props}
            />
          )
        },
        Nav: CustomNav,
        Chevron: ({ className, orientation, ...props }) => {
          if (orientation === "left") {
            return (
              <ChevronLeftIcon className={cn("size-5", className)} {...props} />
            )
          }

          if (orientation === "right") {
            return (
              <ChevronRightIcon
                className={cn("size-5", className)}
                {...props}
              />
            )
          }

          return (
            <ChevronDownIcon className={cn("size-5", className)} {...props} />
          )
        },
        DayButton: CalendarDayButton,
        WeekNumber: ({ children, ...props }) => {
          return (
            <td {...props}>
              <div className="flex size-(--cell-size) items-center justify-center text-center">
                {children}
              </div>
            </td>
          )
        },
        ...components,
      }}
      {...props}
    />
  )
}

function CalendarDayButton({
  className,
  day,
  modifiers,
  ...props
}: React.ComponentProps<typeof DayButton>) {
  const defaultClassNames = getDefaultClassNames()

  const ref = React.useRef<HTMLButtonElement>(null)
  React.useEffect(() => {
    if (modifiers.focused) ref.current?.focus()
  }, [modifiers.focused])

  return (
    <Button
      ref={ref}
      variant="ghost"
      size="icon"
      data-day={day.date.toLocaleDateString()}
      data-selected-single={
        modifiers.selected &&
        !modifiers.range_start &&
        !modifiers.range_end &&
        !modifiers.range_middle
      }
      data-range-start={modifiers.range_start}
      data-range-end={modifiers.range_end}
      data-range-middle={modifiers.range_middle}
      className={cn(
        "data-[selected-single=true]:bg-primary data-[selected-single=true]:text-primary-foreground data-[range-middle=true]:bg-accent data-[range-middle=true]:text-accent-foreground data-[range-start=true]:bg-primary data-[range-start=true]:text-primary-foreground data-[range-end=true]:bg-primary data-[range-end=true]:text-primary-foreground group-data-[focused=true]/day:border-ring group-data-[focused=true]/day:ring-ring/50 dark:hover:text-accent-foreground flex aspect-square size-auto w-full min-w-(--cell-size) flex-col gap-1 leading-none font-normal group-data-[focused=true]/day:relative group-data-[focused=true]/day:z-10 group-data-[focused=true]/day:ring-[3px] data-[range-end=true]:rounded-md data-[range-end=true]:rounded-r-md data-[range-middle=true]:rounded-none data-[range-start=true]:rounded-md data-[range-start=true]:rounded-l-md [&>span]:text-xs [&>span]:opacity-70",
        defaultClassNames.day,
        className
      )}
      {...props}
    />
  )
}

export { Calendar, CalendarDayButton }
