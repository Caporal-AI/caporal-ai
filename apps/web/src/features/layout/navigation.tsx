import EventNoteRoundedIcon from '@mui/icons-material/EventNoteRounded';
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded';
import MonitorHeartRoundedIcon from '@mui/icons-material/MonitorHeartRounded';
import TuneRoundedIcon from '@mui/icons-material/TuneRounded';
import type { ReactNode } from 'react';

export interface AppSection {
  key: 'ingredients' | 'batches' | 'diet' | 'operations';
  path: string;
  labelKey: string;
  icon: ReactNode;
}

export const appSections: AppSection[] = [
  {
    key: 'ingredients',
    path: '/ingredientes',
    labelKey: 'nav.ingredients',
    icon: <Inventory2RoundedIcon />,
  },
  {
    key: 'batches',
    path: '/lotes-plan',
    labelKey: 'nav.batches',
    icon: <EventNoteRoundedIcon />,
  },
  {
    key: 'diet',
    path: '/dieta-simple',
    labelKey: 'nav.diet',
    icon: <TuneRoundedIcon />,
  },
  {
    key: 'operations',
    path: '/operaciones',
    labelKey: 'nav.operations',
    icon: <MonitorHeartRoundedIcon />,
  },
];
