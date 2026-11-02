import { getSession } from './auth';

/** Apakah pengunjung sudah login? Dipakai halaman publik; tidak pernah melempar error. */
export async function isSignedIn(): Promise<boolean> {
  try {
    return (await getSession()) !== null;
  } catch {
    return false;
  }
}
