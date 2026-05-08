import { Box } from '@mui/material'

/** Красная полоса слева у карточки обычного тарифа (не акция). Позиционирование как у прежней волнистой версии: весь рост карточки, поверх фона. */
export default function TariffLeftAccent() {
  return (
    <Box
      aria-hidden
      sx={{
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 4,
        bgcolor: 'secondary.main',
        zIndex: 3,
        pointerEvents: 'none',
      }}
    />
  )
}
