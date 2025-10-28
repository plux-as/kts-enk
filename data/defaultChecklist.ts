
import { ChecklistCategory } from '@/types/checklist';

export const defaultChecklist: ChecklistCategory[] = [
  {
    id: 'cat-1',
    name: 'Personlig Utstyr',
    items: [
      { id: 'item-1-1', name: 'Uniform', categoryId: 'cat-1' },
      { id: 'item-1-2', name: 'Støvler', categoryId: 'cat-1' },
      { id: 'item-1-3', name: 'Hjelm', categoryId: 'cat-1' },
      { id: 'item-1-4', name: 'Vest', categoryId: 'cat-1' },
    ],
  },
  {
    id: 'cat-2',
    name: 'Våpen og Ammunisjon',
    items: [
      { id: 'item-2-1', name: 'Gevær', categoryId: 'cat-2' },
      { id: 'item-2-2', name: 'Magasiner', categoryId: 'cat-2' },
      { id: 'item-2-3', name: 'Ammunisjon', categoryId: 'cat-2' },
    ],
  },
  {
    id: 'cat-3',
    name: 'Kommunikasjon',
    items: [
      { id: 'item-3-1', name: 'Radio', categoryId: 'cat-3' },
      { id: 'item-3-2', name: 'Batterier', categoryId: 'cat-3' },
      { id: 'item-3-3', name: 'Headset', categoryId: 'cat-3' },
    ],
  },
];
