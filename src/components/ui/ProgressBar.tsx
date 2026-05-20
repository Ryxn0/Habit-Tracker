import { cn } from '@/lib/utils'

interface ProgressBarProps {
  value: number  // 0–100
  className?: string
  color?: 'accent' | 'done' | 'warn'
}

export default function ProgressBar({ value, className, color = 'done' }: ProgressBarProps) {
  const colors = {
    accent: 'bg-accent',
    done:   'bg-done',
    warn:   'bg-warn',
  }

  return (
    <div className={cn('h-1.5 bg-border rounded-full overflow-hidden', className)}>
      <div
        className={cn('h-full rounded-full transition-all duration-500', colors[color])}
        style={{ width: `${Math.min(value, 100)}%` }}
      />
    </div>
  )
}
