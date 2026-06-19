# Final Fix Report — Subtype Fix & Local Cache Feature
Date: 2026-06-19

## Fix 1 (Critical): Duplicate migration timestamps — DONE

Renamed conflicting migrations:
- `2026_06_19_000001_relax_chart_of_account_subtypes_schema.php` → `2026_06_19_000004_relax_chart_of_account_subtypes_schema.php`
- `2026_06_19_000002_drop_subtypes_table.php` → `2026_06_19_000005_drop_subtypes_table.php`

Procedure: Rolled back `2026_06_19_000001_relax_chart_of_account_subtypes_schema` via `migrate:rollback --path=...`, renamed both files, then re-applied via `php artisan migrate`.

`migrate:status` confirms: `_000004_` → [3] Ran, `_000005_` → [3] Ran. No duplicate sequence numbers remain.

## Fix 2 (Important): Missing unique constraint — DONE

Created `2026_06_19_000006_add_unique_name_per_coa_on_chart_of_account_subtypes.php` with unique index `cas_name_coa_unique` on `(name, chart_of_account_id)`.

`migrate:status` confirms: `_000006_` → [3] Ran.

## Fix 3 (Important): Bad rollback default(null) — DONE

In `2026_06_19_000004_relax_chart_of_account_subtypes_schema.php` (after rename), changed `down()`:

Before: `$table->unsignedSmallInteger('sort_order')->default(null)->change();`
After:  `$table->unsignedSmallInteger('sort_order')->change();`

## Test Results

`php artisan test` → **9 failed, 242 passed (704 assertions)**

The 9 failures (`GJServiceTest`, `GLServiceTest`, `IncomeStatementServiceTest`, `PeriodClosingTest`) are pre-existing — all caused by a `chk_journal_source` check constraint on `journal_entries` unrelated to this feature. Verified by running the same tests on `main` before applying any changes: identical 9 failures.

## Migration Status (June 19)

| Migration | Batch | Status |
|---|---|---|
| 2026_06_19_000001_add_industry_type_to_companies_table | 2 | Ran |
| 2026_06_19_000002_create_chart_of_account_industries_table | 2 | Ran |
| 2026_06_19_000003_add_liability_to_accounts_type_enum | 2 | Ran |
| 2026_06_19_000004_relax_chart_of_account_subtypes_schema | 3 | Ran |
| 2026_06_19_000005_drop_subtypes_table | 3 | Ran |
| 2026_06_19_000006_add_unique_name_per_coa_on_chart_of_account_subtypes | 3 | Ran |
