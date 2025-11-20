import { useAuthStore } from '@/store/auth';

/**
 * Genel API fetch fonksiyonu
 * 401 hatası geldiğinde otomatik logout yapar (auth endpoint'leri hariç)
 */
export async function apiFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const response = await fetch(url, options);

  // 401 Unauthorized hatası geldiğinde otomatik logout
  // Auth endpoint'leri için 401 normal olabilir (yanlış kod gibi), bu yüzden onları hariç tutuyoruz
  if (response.status === 401 && !url.includes('/api/auth/')) {
    const { logout } = useAuthStore.getState();
    logout();
    
    // Hata fırlat ki çağıran kod hatayı yakalayabilsin
    throw new Error('Unauthorized: Session expired');
  }

  return response;
}

