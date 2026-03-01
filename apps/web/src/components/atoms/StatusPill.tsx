import { Chip } from '@mui/material';

interface StatusPillProps {
  label: string;
  color?: 'default' | 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info';
  variant?: 'filled' | 'outlined';
}

export function StatusPill({
  label,
  color = 'default',
  variant = 'outlined',
}: StatusPillProps): JSX.Element {
  return <Chip size="small" label={label} color={color} variant={variant} />;
}
