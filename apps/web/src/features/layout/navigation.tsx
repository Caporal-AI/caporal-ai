import EventNoteRoundedIcon from '@mui/icons-material/EventNoteRounded';
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded';
import TuneRoundedIcon from '@mui/icons-material/TuneRounded';
import type { ReactNode } from 'react';

export interface AppSection {
  key: 'ingredients' | 'batches' | 'diet';
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
];
