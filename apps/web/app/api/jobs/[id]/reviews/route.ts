/**
 * /api/jobs/:id/reviews — plural alias for /api/jobs/:id/review
 * Mobile clients call the plural form; re-export handlers from singular route.
 */
export { GET, POST } from '../review/route';
