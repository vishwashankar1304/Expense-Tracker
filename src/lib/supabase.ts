import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dazaswtdlmzmlapbtmzd.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRhemFzd3RkbG16bWxhcGJ0bXpkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1MzcyNjksImV4cCI6MjA5MTExMzI2OX0.R8FFG73abZj9ArxYU2YQPoKJVsraUcIpdGKduESRx60';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
