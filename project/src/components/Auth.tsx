import { Auth as SupabaseAuth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '../lib/supabase';

export function Auth() {
  return (
    <div className="w-full max-w-md mx-auto p-6">
      <h1 className="text-3xl font-bold text-center mb-8">Period Mood Tracker</h1>
      <SupabaseAuth 
        supabaseClient={supabase}
        appearance={{ theme: ThemeSupa }}
        providers={[]}
      />
    </div>
  );
}