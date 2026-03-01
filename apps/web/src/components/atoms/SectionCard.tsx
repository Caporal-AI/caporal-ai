import styled from '@emotion/styled';
import { Paper, type PaperProps } from '@mui/material';

const BaseCard = styled(Paper)`
  padding: 1rem;
  border-radius: 14px;
`;

export function SectionCard(props: PaperProps): JSX.Element {
  return <BaseCard elevation={0} {...props} />;
}
