import { useEffect, useState } from 'react';
import { navigation } from '../config/navigation';
import type { PageId } from '../config/navigation';
function currentPage(): PageId {
  const id = window.location.hash.slice(1);
  return navigation.find((item) => item.id === id)?.id ?? 'overview';
}
export function usePage() {
  const [page, setPage] = useState<PageId>(currentPage);
  useEffect(() => { const change = () => setPage(currentPage()); window.addEventListener('hashchange', change); return () => window.removeEventListener('hashchange', change); }, []);
  useEffect(() => { document.title = `${navigation.find((item) => item.id === page)?.label ?? 'Resumen'} · KhipuTrace`; }, [page]);
  return page;
}
