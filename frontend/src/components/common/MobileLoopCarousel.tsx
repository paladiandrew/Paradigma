import ChevronLeft from '@mui/icons-material/ChevronLeft'
import ChevronRight from '@mui/icons-material/ChevronRight'
import { Box, IconButton } from '@mui/material'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'

type Props = {
  children: ReactNode[]
  /** ~0.85 — карточка уже вьюпорта, видны края соседних */
  peek?: boolean
  /** Доля ширины одной карточки при peek (например 0.8 = 80%) */
  slideFraction?: number
}

export default function MobileLoopCarousel({ children, peek = false, slideFraction = 0.85 }: Props) {
  const items = children.filter(Boolean)
  const n = items.length
  const [index, setIndex] = useState(0)
  const touchStartX = useRef<number | null>(null)
  const scrollerRef = useRef<HTMLDivElement>(null)

  const scrollToIndex = useCallback((i: number) => {
    const el = scrollerRef.current
    if (!el || !peek) return
    const card = el.children[i] as HTMLElement | undefined
    if (card) card.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }, [peek])

  useEffect(() => {
    if (peek) scrollToIndex(index)
  }, [index, peek, scrollToIndex])

  if (n === 0) return null

  const go = (delta: number) => {
    setIndex((i) => (i + delta + n) % n)
  }

  const padPct = peek ? `${((1 - slideFraction) / 2) * 100}%` : 0
  const slidePct = peek ? `${slideFraction * 100}%` : '100%'

  if (peek) {
    return (
      <Box sx={{ width: '100%', maxWidth: '100%', mx: 'auto', overflow: 'visible', py: 0.5 }}>
        <Box
          ref={scrollerRef}
          sx={{
            display: 'flex',
            gap: 1,
            overflowX: 'auto',
            scrollSnapType: 'x mandatory',
            scrollPaddingLeft: padPct,
            scrollPaddingRight: padPct,
            px: padPct,
            py: 1,
            scrollbarWidth: 'none',
            WebkitOverflowScrolling: 'touch',
            '&::-webkit-scrollbar': { display: 'none' },
          }}
          onScroll={(e) => {
            const t = e.currentTarget
            const w = t.clientWidth
            const scrollCenter = t.scrollLeft + w / 2
            let best = 0
            let bestDist = Infinity
            for (let i = 0; i < t.children.length; i++) {
              const c = t.children[i] as HTMLElement
              const cx = c.offsetLeft + c.offsetWidth / 2
              const d = Math.abs(cx - scrollCenter)
              if (d < bestDist) {
                bestDist = d
                best = i
              }
            }
            setIndex(best)
          }}
        >
          {items.map((child, i) => (
            <Box
              key={i}
              sx={{
                flex: `0 0 ${slidePct}`,
                maxWidth: slidePct,
                scrollSnapAlign: 'center',
                boxSizing: 'border-box',
                display: 'flex',
                justifyContent: 'center',
              }}
            >
              <Box sx={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>{child}</Box>
            </Box>
          ))}
        </Box>
        {n > 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 0.5, mt: 2, width: '100%' }}>
            <IconButton size="small" onClick={() => go(-1)} aria-label="Предыдущий" sx={{ color: 'text.secondary' }}>
              <ChevronLeft />
            </IconButton>
            <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center', px: 1 }}>
              {items.map((_, i) => (
                <Box
                  key={i}
                  onClick={() => {
                    setIndex(i)
                    scrollToIndex(i)
                  }}
                  role="presentation"
                  sx={{
                    width: i === index ? 10 : 8,
                    height: i === index ? 10 : 8,
                    borderRadius: '50%',
                    bgcolor: i === index ? 'secondary.main' : 'action.disabledBackground',
                    cursor: 'pointer',
                    transition: 'transform 0.2s, background-color 0.2s',
                  }}
                />
              ))}
            </Box>
            <IconButton size="small" onClick={() => go(1)} aria-label="Следующий" sx={{ color: 'text.secondary' }}>
              <ChevronRight />
            </IconButton>
          </Box>
        )}
      </Box>
    )
  }

  return (
    <Box sx={{ width: '100%', maxWidth: '100%', mx: 'auto' }}>
      <Box
        sx={{ overflow: 'hidden', width: '100%' }}
        onTouchStart={(e) => {
          touchStartX.current = e.touches[0].clientX
        }}
        onTouchEnd={(e) => {
          if (touchStartX.current == null) return
          const dx = e.changedTouches[0].clientX - touchStartX.current
          touchStartX.current = null
          if (dx > 56) go(-1)
          else if (dx < -56) go(1)
        }}
      >
        <Box
          sx={{
            display: 'flex',
            width: '100%',
            transform: `translateX(-${index * 100}%)`,
            transition: 'transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          {items.map((child, i) => (
            <Box
              key={i}
              sx={{
                width: '100%',
                flexShrink: 0,
                boxSizing: 'border-box',
                px: 0,
                display: 'flex',
                justifyContent: 'center',
              }}
            >
              <Box sx={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>{child}</Box>
            </Box>
          ))}
        </Box>
      </Box>
      {n > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 0.5, mt: 2, width: '100%' }}>
          <IconButton size="small" onClick={() => go(-1)} aria-label="Предыдущий" sx={{ color: 'text.secondary' }}>
            <ChevronLeft />
          </IconButton>
          <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center', px: 1 }}>
            {items.map((_, i) => (
              <Box
                key={i}
                onClick={() => setIndex(i)}
                role="presentation"
                sx={{
                  width: i === index ? 10 : 8,
                  height: i === index ? 10 : 8,
                  borderRadius: '50%',
                  bgcolor: i === index ? 'secondary.main' : 'action.disabledBackground',
                  cursor: 'pointer',
                  transition: 'transform 0.2s, background-color 0.2s',
                }}
              />
            ))}
          </Box>
          <IconButton size="small" onClick={() => go(1)} aria-label="Следующий" sx={{ color: 'text.secondary' }}>
            <ChevronRight />
          </IconButton>
        </Box>
      )}
    </Box>
  )
}
