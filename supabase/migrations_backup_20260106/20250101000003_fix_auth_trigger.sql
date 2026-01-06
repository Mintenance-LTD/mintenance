-- Fix handle_new_user trigger to work with Supabase Auth
-- Make password_hash nullable for Supabase Auth users (they don't have password_hash in public.users)

-- First, make password_hash nullable if it's not already
ALTER TABLE public.users 
ALTER COLUMN password_hash DROP NOT NULL;

-- Update the handle_new_user trigger to handle Supabase Auth users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Insert user profile from auth.users to public.users
  -- Note: password_hash is NULL for Supabase Auth users (password is in auth.users)
  INSERT INTO public.users (
    id, 
    email, 
    first_name, 
    last_name, 
    role,
    phone,
    email_verified,
    password_hash  -- NULL for Supabase Auth users
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'homeowner')::text,
    COALESCE(NEW.raw_user_meta_data->>'phone', NULL),
    COALESCE(NEW.email_confirmed_at IS NOT NULL, false),
    NULL  -- No password_hash for Supabase Auth users
  )
  ON CONFLICT (id) 
  DO UPDATE SET
    email = EXCLUDED.email,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    role = EXCLUDED.role,
    phone = COALESCE(EXCLUDED.phone, public.users.phone),
    email_verified = COALESCE(EXCLUDED.email_verified, public.users.email_verified),
    updated_at = NOW();
  
  RETURN NEW;
EXCEPTION
  WHEN others THEN
    -- Log error but don't fail the auth signup
    RAISE WARNING 'Error in handle_new_user trigger: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Ensure the trigger exists on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

COMMENT ON FUNCTION public.handle_new_user() IS 'Creates a user profile in public.users when a new user signs up via Supabase Auth';

