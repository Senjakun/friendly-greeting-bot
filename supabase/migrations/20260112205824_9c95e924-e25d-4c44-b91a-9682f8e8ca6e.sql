-- Add body_text column to store email content (for OTP extraction)
ALTER TABLE public.email_logs 
ADD COLUMN IF NOT EXISTS body_text TEXT;