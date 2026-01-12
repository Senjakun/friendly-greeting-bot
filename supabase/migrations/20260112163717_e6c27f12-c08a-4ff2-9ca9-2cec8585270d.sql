-- Remove unnecessary OAuth token columns since we're using Cloudflare Email Workers
ALTER TABLE public.email_accounts 
DROP COLUMN IF EXISTS access_token,
DROP COLUMN IF EXISTS refresh_token,
DROP COLUMN IF EXISTS token_expires_at;