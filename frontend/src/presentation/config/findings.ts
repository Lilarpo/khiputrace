import type { Severity } from '../../domain/entities';
export const severityOptions: readonly { readonly value: Severity; readonly label: string }[] = [
  { value: 'low', label: 'Baja' }, { value: 'medium', label: 'Media' },
  { value: 'high', label: 'Alta' }, { value: 'critical', label: 'Crítica' },
];
export const severityLabel = (value: Severity) => severityOptions.find((option) => option.value === value)?.label ?? value;
