-- Document expiry dates are useful for IDs and certificates, but not every
-- document (for example a lease agreement) has one.
alter table public.documents
    alter column expires_on drop not null;
