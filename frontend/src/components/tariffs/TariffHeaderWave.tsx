import { Box } from '@mui/material'

export type TariffHeaderWaveVariant = 'default' | 'tariffsPage'

type Props = {
  /** Оставлено для совместимости; отступы у волны единые везде. */
  variant?: TariffHeaderWaveVariant
}

/** Единая волна между цветной шапкой и белым телом карточки тарифа (главная, /tariffs, админ-предпросмотр). */
export default function TariffHeaderWave({ variant: _variant = 'default' }: Props) {
  return (
    <Box
      sx={{
        width: '100%',
        lineHeight: 0,
        flexShrink: 0,
        alignSelf: 'stretch',
        /** Небольшой зазор после блока цен — волна визуально выше, без «сползания» вниз. */
        mt: { xs: '6px', sm: '8px' },
        /** Лёгкое перекрытие с белым телом карточки — убираем щель в 1px, без сильного сдвига. */
        mb: '-8px',
        position: 'relative',
        zIndex: 1,
      }}
    >
      <Box
        component="svg"
        viewBox="0 0 400 32"
        preserveAspectRatio="none"
        sx={{ display: 'block', width: '100%', height: 26, verticalAlign: 'bottom' }}
      >
        <path fill="#ffffff" d="M0,12 Q100,28 200,14 T400,12 L400,32 L0,32 Z" />
      </Box>
    </Box>
  )
}
