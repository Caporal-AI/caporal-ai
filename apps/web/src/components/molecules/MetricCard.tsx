import styled from '@emotion/styled';
import { Typography } from '@mui/material';
import { SectionCard } from '../atoms/SectionCard';

const MetricTitle = styled(Typography)`
  font-size: 0.82rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
`;

const MetricValue = styled(Typography)`
  margin-top: 0.4rem;
  font-weight: 800;
  line-height: 1.2;
`;

const MetricHint = styled(Typography)`
  margin-top: 0.3rem;
`;

interface MetricCardProps {
  title: string;
  value: string;
  hint?: string;
}

export function MetricCard({ title, value, hint }: MetricCardProps): JSX.Element {
  return (
    <SectionCard>
      <MetricTitle color="text.secondary">{title}</MetricTitle>
      <MetricValue variant="h6">{value}</MetricValue>
      {hint ? (
        <MetricHint variant="body2" color="text.secondary">
          {hint}
        </MetricHint>
      ) : null}
    </SectionCard>
  );
}
