import { redirect } from 'next/navigation';

/**
 * /favorites redirects to /properties which has the working
 * favorites system (DB-backed property_favorites table, toggle UI,
 * and favorites filter in the toolbar).
 */
export default function FavoritesRedirect() {
  redirect('/properties');
}
