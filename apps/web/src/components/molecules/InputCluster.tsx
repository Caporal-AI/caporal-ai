import styled from '@emotion/styled';
import { Box } from '@mui/material';

export const InputCluster = styled(Box)`
  display: grid;
  grid-template-columns: repeat(1, minmax(0, 1fr));
  gap: 0.75rem;

  @media (min-width: 900px) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
`;
