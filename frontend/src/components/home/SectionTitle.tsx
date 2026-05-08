import { Box, Typography } from '@mui/material'

type Props = {
  title: string
  subtitle?: string
}

export default function SectionTitle({ title, subtitle }: Props) {
  return (
    <Box sx={{ textAlign: 'center', width: '100%', maxWidth: '100%', boxSizing: 'border-box', mx: 'auto' }}>
      <Typography variant="h4" component="h2" fontWeight={700}>
        {title}
      </Typography>
      <Box
        sx={{
          width: 40,
          height: 3,
          bgcolor: 'secondary.main',
          borderRadius: 1,
          mx: 'auto',
          mt: '8px',
          mb: '40px',
        }}
      />
      {subtitle ? (
        <Typography
          variant="body1"
          color="text.secondary"
          sx={{ mb: 6, maxWidth: 560, mx: 'auto' }}
        >
          {subtitle}
        </Typography>
      ) : null}
    </Box>
  )
}
