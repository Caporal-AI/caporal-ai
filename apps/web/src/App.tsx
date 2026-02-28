import { Box, Container, Paper, Tab, Tabs, Typography } from '@mui/material';
import { useState } from 'react';
import { AssistantScreen } from './screens/AssistantScreen';
import { BatchWorkflowScreen } from './screens/BatchWorkflowScreen';
import { GenerateDietScreen } from './screens/GenerateDietScreen';
import { IngredientsScreen } from './screens/IngredientsScreen';

export function App(): JSX.Element {
  const [tab, setTab] = useState(0);
  const [selectedDietRunId, setSelectedDietRunId] = useState<string | null>(null);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background:
          'radial-gradient(circle at 15% 0%, rgba(76,224,179,.22), transparent 35%), radial-gradient(circle at 85% 10%, rgba(244,180,95,.2), transparent 28%), #0b1117',
        py: { xs: 2, md: 4 },
      }}
    >
      <Container maxWidth="xl">
        <Paper sx={{ p: { xs: 2, md: 3 }, mb: 2.5 }}>
          <Typography variant="overline" sx={{ color: 'secondary.main', letterSpacing: '0.14em' }}>
            CAPORAL AI
          </Typography>
          <Typography variant="h3" sx={{ mt: 0.3 }}>
            Dietas claras para ganado de engorda
          </Typography>
          <Typography sx={{ color: 'text.secondary', maxWidth: 780, mt: 1.2 }}>
            Diseñada para personas no expertas: edita ingredientes con lenguaje simple, genera una
            recomendacion y entiende por que se eligio.
          </Typography>
        </Paper>

        <Paper sx={{ p: { xs: 1.2, md: 2.2 } }}>
          <Tabs
            value={tab}
            onChange={(_, value: number) => {
              setTab(value);
            }}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              borderBottom: '1px solid rgba(156,176,197,0.2)',
              mb: 2,
            }}
          >
            <Tab label="1. Ingredientes" />
            <Tab label="2. Lotes y plan semanal" />
            <Tab label="3. Generar dieta simple" />
            <Tab label="4. Asistente" />
          </Tabs>

          {tab === 0 ? <IngredientsScreen /> : null}
          {tab === 1 ? (
            <BatchWorkflowScreen
              selectedDietRunId={selectedDietRunId}
              onDietRunSelected={setSelectedDietRunId}
            />
          ) : null}
          {tab === 2 ? (
            <GenerateDietScreen
              selectedDietRunId={selectedDietRunId}
              onDietRunSelected={setSelectedDietRunId}
            />
          ) : null}
          {tab === 3 ? <AssistantScreen dietRunId={selectedDietRunId} /> : null}
        </Paper>
      </Container>
    </Box>
  );
}
