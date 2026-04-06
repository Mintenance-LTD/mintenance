/**
 * MFA Service - Constants
 *
 * Pure constant values extracted from mfa-service.ts.
 * Values must match original MFAService private static readonly fields exactly.
 */

/** Allow 1 step before/after for time drift */
export const TOTP_WINDOW = 1;

export const BACKUP_CODE_LENGTH = 8;

export const BACKUP_CODE_COUNT = 10;

/** 10 minutes in milliseconds */
export const PRE_MFA_SESSION_DURATION = 10 * 60 * 1000;

/** 30 days in milliseconds */
export const TRUSTED_DEVICE_DURATION = 30 * 24 * 60 * 60 * 1000;

/** TOTP issuer label shown in authenticator apps */
export const TOTP_ISSUER = 'Mintenance';

/** TOTP hashing algorithm */
export const TOTP_ALGORITHM = 'SHA1';

/** TOTP code digit count */
export const TOTP_DIGITS = 6;

/** TOTP time-step period in seconds */
export const TOTP_PERIOD = 30;

/** TOTP secret byte size */
export const TOTP_SECRET_SIZE = 32;
