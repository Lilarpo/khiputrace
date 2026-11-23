export type IconName = 'grid' | 'shield' | 'scan' | 'book' | 'wallet' | 'arrow' | 'link' | 'close' | 'check' | 'refresh' | 'copy' | 'alert' | 'logout';
const paths: Record<IconName, string> = {
  grid: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
  shield: 'M12 3l8 3v6c0 5-8 9-8 9s-8-4-8-9V6z M8 12l3 3 5-6',
  scan: 'M8 3H3v5 M16 3h5v5 M3 16v5h5 M21 16v5h-5 M12 8v5 M12 17v.1',
  book: 'M4 4h6c2 0 2 2 2 2s0-2 2-2h6v15h-6c-2 0-2 2-2 2s0-2-2-2H4z M12 6v15',
  wallet: 'M20 8V5H4v15h17V8H4 M21 12h-6v4h6 M17 14h.1',
  arrow: 'M4 12h16 M14 6l6 6-6 6', link: 'M10 13l4-4 M8 15l-1 1a4 4 0 01-5-5l4-4a4 4 0 015 0 M16 9l1-1a4 4 0 015 5l-4 4a4 4 0 01-5 0',
  close: 'M6 6l12 12 M6 18L18 6', check: 'M5 12l4 4L19 6',
  refresh: 'M20 8a8 8 0 10.5 7 M20 3v5h-5', copy: 'M9 9h12v12H9z M15 9V3H3v12h6',
  alert: 'M12 3L2 21h20z M12 9v5 M12 17v.1', logout: 'M10 4H4v16h6 M9 12h12 M17 8l4 4-4 4',
};
export function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>;
}
export function BrandMark() {
  return <svg viewBox="0 0 40 40" width="38" height="38" fill="none" aria-hidden="true"><rect width="40" height="40" rx="12" fill="currentColor" /><path d="M12 10v20M20 10v20M28 10v20M12 15h16" stroke="#101d2b" strokeWidth="2.5" /><circle cx="12" cy="23" r="3" fill="#101d2b" /><circle cx="20" cy="28" r="3" fill="#101d2b" /><circle cx="28" cy="21" r="3" fill="#101d2b" /></svg>;
}
