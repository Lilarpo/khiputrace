export const navigation = [
  { id: 'overview', label: 'Resumen', icon: 'grid' },
  { id: 'audits', label: 'Auditorías', icon: 'shield' },
  { id: 'findings', label: 'Hallazgos', icon: 'scan' },
  { id: 'guide', label: 'Guía de uso', icon: 'book' },
] as const;
export type PageId = typeof navigation[number]['id'];
