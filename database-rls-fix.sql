-- Fix RLS policies for user registration
-- Run this in your Supabase SQL Editor

-- Add missing INSERT policy for users table
CREATE POLICY "Enable insert for authenticated users during signup" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Add policy to allow service role to insert users (needed for signup process)
CREATE POLICY "Enable insert for service role" ON public.users
  FOR INSERT WITH CHECK (true);

-- Optional: Add policy to view all users for admin purposes
-- (Remove this if you don't want this functionality)
CREATE POLICY "Enable read access for service role" ON public.users
  FOR SELECT USING (true);

-- Verify the policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'users';