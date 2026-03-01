import styled from '@emotion/styled';
import { Typography } from '@mui/material';
import { SectionCard } from './SectionCard';

const HeaderTitle = styled(Typography)`
  font-weight: 800;
  line-height: 1.1;
`;

const HeaderSubtitle = styled(Typography)`
  margin-top: 0.45rem;
`;

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
}

export function SectionHeader({ title, subtitle }: SectionHeaderProps): JSX.Element {
  return (
    <SectionCard>
      <HeaderTitle variant="h5">{title}</HeaderTitle>
      {subtitle ? (
        <HeaderSubtitle variant="body2" color="text.secondary">
          {subtitle}
        </HeaderSubtitle>
      ) : null}
    </SectionCard>
  );
}
