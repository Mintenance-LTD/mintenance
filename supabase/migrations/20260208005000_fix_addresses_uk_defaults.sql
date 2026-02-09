-- Migration: Fix American defaults in addresses table
-- Date: 2026-02-08
-- Changes default country from 'USA' to 'UK' for British-based platform

BEGIN;

ALTER TABLE public.addresses ALTER COLUMN country SET DEFAULT 'UK';

COMMIT;
