-- Spend Lens — PDF statement import (beta extension)
-- Adds 'pdf_upload' to the allowed transactions.source_type values.
--
-- Run AFTER 0001–0004, in the Supabase SQL editor or via the CLI. Idempotent.
-- No new tables and no RLS changes — transactions RLS already covers pdf_upload rows.

alter table public.transactions
  drop constraint if exists transactions_source_type_check;

alter table public.transactions
  add constraint transactions_source_type_check
  check (source_type in (
    'manual',
    'receipt_paste',
    'csv_upload',
    'pdf_upload',
    'email_forward_later',
    'bank_feed_later'
  ));
