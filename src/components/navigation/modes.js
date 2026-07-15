import { LayoutGrid, Shuffle, Hourglass, Calculator } from 'lucide-react';

export const MODES = [
  {
    id: 'classic',
    label: 'Classic Mode',
    shortLabel: 'Classic',
    description: 'Daily year guessing',
    icon: LayoutGrid,
  },
  {
    id: 'timeshift',
    label: 'Time Shift',
    shortLabel: 'Time Shift',
    description: 'Earlier/later streaks',
    icon: Shuffle,
  },
  {
    id: 'chronology',
    label: 'Chronology',
    shortLabel: 'Chronology',
    description: 'Order the timeline',
    icon: Hourglass,
  },
  {
    id: 'algebra',
    label: 'Timeline Algebra',
    shortLabel: 'Algebra',
    description: 'Solve year equations',
    icon: Calculator,
  },
];
