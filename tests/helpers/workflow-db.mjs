import { PGlite } from '@electric-sql/pglite';
import { readdir, readFile } from 'node:fs/promises';

/** Real migration chain in an isolated database. Supabase-managed schemas are stubbed only. */
export async function workflowDatabase() {
	const db = new PGlite();
	await db.exec(`
 create role anon; create role authenticated; create role service_role;
 create schema auth; create schema storage; create schema extensions;
 create table auth.users(id uuid primary key, email text, raw_user_meta_data jsonb default '{}');
 create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 create function auth.role() returns text language sql stable as $$ select current_setting('role',true) $$;
 create function auth.jwt() returns jsonb language sql stable as $$ select '{}'::jsonb $$;
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text,owner uuid,owner_id text);
 create function storage.foldername(text) returns text[] language sql immutable as $$ select string_to_array($1,'/') $$;
 `);
	const dir = new URL('../../supabase/migrations/', import.meta.url);
	for (const file of (await readdir(dir)).filter((f) => f.endsWith('.sql')).sort()) {
		const sql = (await readFile(new URL(file, dir), 'utf8')).replace(
			/create extension if not exists pgcrypto;/gi,
			''
		);
		try {
			await db.exec(sql);
		} catch (error) {
			await db.close();
			throw new Error(
				`Migration ${file}: ${error.message} at ${error.position}: ${sql.slice(Number(error.position) - 100, Number(error.position) + 100)}`,
				{ cause: error }
			);
		}
	}
	await db.exec(`grant usage on schema public,auth,private to authenticated;
 grant select,insert,update,delete on all tables in schema public to authenticated;
 grant usage,select on all sequences in schema public to authenticated;`);
	return db;
}
