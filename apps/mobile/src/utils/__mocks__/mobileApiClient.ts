/**
 * Manual mock for mobileApiClient
 *
 * Prevents tests from going through supabase.auth.getSession()
 * which requires a full auth mock. Each method is a jest.fn()
 * that resolves to an empty object by default. Tests can override
 * per-call via mockResolvedValueOnce / mockImplementation.
 */

export const mobileApiClient = {
  get: jest.fn().mockResolvedValue({}),
  post: jest.fn().mockResolvedValue({}),
  put: jest.fn().mockResolvedValue({}),
  patch: jest.fn().mockResolvedValue({}),
  delete: jest.fn().mockResolvedValue({}),
  postFormData: jest.fn().mockResolvedValue({}),
};
