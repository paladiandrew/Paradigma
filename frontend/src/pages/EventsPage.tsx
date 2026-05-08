import {
  Box,
  Card,
  CardContent,
  Chip,
  Stack,
  Typography,
} from '@mui/material'
import { useEffect, useMemo, useState } from 'react'
import api from '../services/api'
import { formatRuCalendarDate, parseApiCalendarDate } from '../utils/formatDates'

export default function EventsPage() {
  const [events, setEvents] = useState<any[]>([])
  useEffect(() => {
    api.get('/events', { params: { type: 'news' } }).then((res) => setEvents(res.data || []))
  }, [])

  const normalized = useMemo(
    () =>
      [...events].sort(
        (a, b) =>
          (parseApiCalendarDate(b.date)?.getTime() ?? 0) -
          (parseApiCalendarDate(a.date)?.getTime() ?? 0),
      ),
    [events],
  )

  return (
    <Box
      component="main"
      sx={{
        py: { xs: 4, sm: 5, md: 7 },
        px: { xs: 2, sm: 3 },
        display: 'flex',
        justifyContent: 'center',
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      <Box
        sx={{
          width: '100%',
          maxWidth: { xs: 'min(100%, 560px)', sm: 'min(92vw, 720px)', md: 'min(90vw, 880px)' },
          mx: 'auto',
        }}
      >
        <Typography
          variant="h3"
          fontWeight={800}
          textAlign="center"
          sx={{
            mb: { xs: 3, md: 4 },
            fontSize: { xs: '2rem', sm: '2.35rem', md: '2.75rem' },
          }}
        >
          Новости
        </Typography>

        <Stack spacing={{ xs: 3, md: 4 }} alignItems="stretch">
          {normalized.map((event) => (
            <Card
              key={event.id}
              elevation={0}
              sx={{
                borderRadius: '28px',
                border: '2px solid',
                borderColor: 'secondary.main',
                overflow: 'hidden',
                bgcolor: 'background.paper',
                boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
                transition: 'box-shadow 0.25s ease, transform 0.25s ease',
                '&:hover': {
                  boxShadow: '0 10px 36px rgba(0,0,0,0.1)',
                  transform: 'translateY(-2px)',
                },
              }}
            >
              <CardContent
                sx={{
                  textAlign: 'center',
                  py: { xs: 3, md: 4 },
                  px: { xs: 3, sm: 4, md: 5 },
                  '&:last-child': { pb: { xs: 3, md: 4 } },
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexWrap: 'wrap',
                    gap: { xs: 1.5, md: 2 },
                    mb: { xs: 2.5, md: 3 },
                  }}
                >
                  <Chip
                    label="Новость"
                    color="secondary"
                    variant="outlined"
                    sx={{
                      borderWidth: 2,
                      fontWeight: 700,
                      fontSize: { xs: '0.85rem', md: '0.95rem' },
                      height: { xs: 32, md: 36 },
                    }}
                  />
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ fontSize: { xs: '0.95rem', md: '1.05rem' } }}
                  >
                    {formatRuCalendarDate(event.date)}
                  </Typography>
                </Box>
                <Typography
                  variant="h6"
                  component="h2"
                  fontWeight={800}
                  gutterBottom
                  sx={{
                    fontSize: { xs: '1.35rem', sm: '1.5rem', md: '1.75rem' },
                    lineHeight: 1.35,
                    mb: { xs: 2, md: 2.5 },
                  }}
                >
                  {event.title}
                </Typography>
                {event.imageUrl ? (
                  <Box
                    component="img"
                    src={event.imageUrl}
                    alt={event.title ? `Иллюстрация: ${event.title}` : ''}
                    sx={{
                      display: 'block',
                      width: '100%',
                      maxHeight: { xs: 280, sm: 360, md: 420 },
                      objectFit: 'cover',
                      borderRadius: 2,
                      mb: { xs: 2, md: 2.5 },
                    }}
                  />
                ) : null}
                <Typography
                  color="text.secondary"
                  paragraph
                  sx={{
                    textAlign: 'center',
                    mb: event.endDate ? 2 : 0,
                    fontSize: { xs: '1.0625rem', md: '1.125rem' },
                    lineHeight: 1.75,
                    maxWidth: '62ch',
                    mx: 'auto',
                  }}
                >
                  {event.description}
                </Typography>
                {event.endDate && (
                  <Typography
                    color="text.secondary"
                    sx={{
                      textAlign: 'center',
                      fontSize: { xs: '0.95rem', md: '1.02rem' },
                    }}
                  >
                    {(parseApiCalendarDate(event.endDate)?.getTime() ?? 0) < Date.now()
                      ? 'Период завершён'
                      : `По: ${formatRuCalendarDate(event.endDate)}`}
                  </Typography>
                )}
              </CardContent>
            </Card>
          ))}
        </Stack>
      </Box>
    </Box>
  )
}
