import { Box } from '@mui/material'
import { useEffect, useRef, useState, type ReactNode } from 'react'

type Props = {
  children: ReactNode
  threshold?: number
  /** Задержка появления в мс (stagger) */
  delayMs?: number
}

export default function RevealWrapper({ children, threshold = 0.15, delayMs = 0 }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setVisible(true)
          obs.disconnect()
        }
      },
      { threshold },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])

  return (
    <Box
      ref={ref}
      sx={{
        width: '100%',
        maxWidth: '100%',
        boxSizing: 'border-box',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(20px)',
        transition: `opacity 0.6s ease-out ${delayMs}ms, transform 0.6s ease-out ${delayMs}ms`,
      }}
    >
      {children}
    </Box>
  )
}
