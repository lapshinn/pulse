import type { HTMLAttributes, ReactNode } from 'react'
import { Info } from 'lucide-react'

interface PanelProps extends HTMLAttributes<HTMLElement> {
  title?: string
  eyebrow?: string
  action?: ReactNode
  hint?: string
  children: ReactNode
}

export function Tooltip({ text }: { text: string }) {
  return (
    <span className="tooltip">
      <button type="button" className="icon-button tooltip__trigger" aria-label="Подробнее">
        <Info size={15} aria-hidden="true" />
      </button>
      <span className="tooltip__content" role="tooltip">
        {text}
      </span>
    </span>
  )
}

export function Panel({ title, eyebrow, action, hint, children, className = '', ...props }: PanelProps) {
  return (
    <article className={`panel ${className}`.trim()} {...props}>
      {(title || eyebrow || action) && (
        <header className="panel__header">
          <div>
            {eyebrow && <p className="eyebrow">{eyebrow}</p>}
            {title && (
              <h3>
                {title}
                {hint && <Tooltip text={hint} />}
              </h3>
            )}
          </div>
          {action}
        </header>
      )}
      {children}
    </article>
  )
}

export function SectionHeading({
  kicker,
  title,
  description,
}: {
  kicker: string
  title: string
  description: string
}) {
  return (
    <header className="section-heading">
      <p className="eyebrow">{kicker}</p>
      <h2>{title}</h2>
      <p>{description}</p>
    </header>
  )
}
