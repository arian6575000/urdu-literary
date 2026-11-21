import type { IconName } from '../components/design-system/Icon';

export interface CategoryDef { id: string; name: string; icon: IconName; poetry: boolean }

export const CATEGORIES: CategoryDef[] = [
  { id: 'ghazal', name: 'غزل', icon: 'musical-notes-outline', poetry: true },
  { id: 'nazm', name: 'نظم', icon: 'leaf-outline', poetry: true },
  { id: 'sher', name: 'شعر', icon: 'sparkles-outline', poetry: true },
  { id: 'nasr', name: 'نثر', icon: 'reader-outline', poetry: false },
  { id: 'afsana', name: 'افسانہ', icon: 'book-outline', poetry: false },
  { id: 'mazmoon', name: 'مضمون', icon: 'newspaper-outline', poetry: false },
  { id: 'diary', name: 'ذاتی ڈائری', icon: 'journal-outline', poetry: false },
  { id: 'free', name: 'آزاد تحریر', icon: 'create-outline', poetry: false },
  { id: 'quote', name: 'ادبی اقتباس', icon: 'chatbox-ellipses-outline', poetry: false },
];

export const catById = (id: string): CategoryDef => CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[7];
export const isPoetry = (id: string) => catById(id).poetry;
