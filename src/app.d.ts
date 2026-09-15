// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		interface Locals {
			supabase: import('@supabase/supabase-js').SupabaseClient;
			safeGetSession: () => Promise<{
				user: import('@supabase/supabase-js').User | null;
				session: import('@supabase/supabase-js').Session | null;
			}>;
		}
		// interface Error {}
		interface PageData {
			session: import('@supabase/supabase-js').Session | null;
			user: import('@supabase/supabase-js').User | null;
		}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
