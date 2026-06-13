<?php

namespace App\Services\Accounting;

use App\Models\Account;
use App\Models\AdjustingEntry;
use App\Models\Company;
use App\Models\Document;
use App\Models\JournalEntry;
use App\Models\JournalEntryLine;
use App\Models\PeriodClosing;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;

class PeriodClosingService
{
    /** Returns 'closed' | 'ready' | 'blocked' | 'future' */
    public function getMonthStatus(Company $company, int $year, int $month, ?Carbon $firstMonth = null): string
    {
        if (PeriodClosing::where('company_id', $company->id)
            ->where('period_year', $year)
            ->where('period_month', $month)
            ->exists()) {
            return 'closed';
        }

        $firstMonth = $firstMonth ?? $this->getFirstCloseableMonth($company);
        if (!$firstMonth) {
            return 'future';
        }

        $isFirstMonth = ($year === $firstMonth->year && $month === $firstMonth->month);

        if (!$isFirstMonth) {
            $prior = Carbon::create($year, $month)->subMonth();
            $priorClosed = PeriodClosing::where('company_id', $company->id)
                ->where('period_year', $prior->year)
                ->where('period_month', $prior->month)
                ->exists();
            if (!$priorClosed) {
                return 'future';
            }
        }

        $start = Carbon::create($year, $month, 1)->startOfMonth();
        $end   = Carbon::create($year, $month, 1)->endOfMonth();

        $pendingDocs = Document::where('company_id', $company->id)
            ->whereBetween('document_date', [$start, $end])
            ->whereNotIn('status', ['approved', 'rejected', 'cancelled'])
            ->exists();
        if ($pendingDocs) {
            return 'blocked';
        }

        $pendingAJEs = AdjustingEntry::where('company_id', $company->id)
            ->whereBetween('entry_date', [$start, $end])
            ->whereIn('status', ['draft', 'submitted'])
            ->exists();
        if ($pendingAJEs) {
            return 'blocked';
        }

        return 'ready';
    }

    public function getFirstCloseableMonth(Company $company): ?Carbon
    {
        // Only consider entries from the current calendar year — entries with
        // dates before Jan 1 of this year are garbage data that should not
        // force accountants to close thousands of phantom periods.
        $cutoff = Carbon::now()->startOfYear()->toDateString();

        $first = JournalEntry::where('company_id', $company->id)
            ->where('status', 'posted')
            ->whereNull('period_closing_id')
            ->where('entry_date', '>=', $cutoff)
            ->whereHas('lines', function ($q) {
                $q->whereHas('account', fn($a) => $a->whereIn('type', ['income', 'expense']));
            })
            ->orderBy('entry_date')
            ->value('entry_date');

        return $first ? Carbon::parse($first)->startOfMonth() : null;
    }

    public function getTimeline(Company $company): array
    {
        $firstMonth = $this->getFirstCloseableMonth($company);
        if (!$firstMonth) {
            return [];
        }

        $months = [];
        $cursor = $firstMonth->copy();
        $now    = Carbon::now()->startOfMonth();

        while ($cursor->lte($now)) {
            $year  = $cursor->year;
            $month = $cursor->month;

            $start = $cursor->copy()->startOfMonth();
            $end   = $cursor->copy()->endOfMonth();

            $pendingDocs = Document::where('company_id', $company->id)
                ->whereBetween('document_date', [$start, $end])
                ->whereNotIn('status', ['approved', 'rejected', 'cancelled'])
                ->count();

            $pendingAJEs = AdjustingEntry::where('company_id', $company->id)
                ->whereBetween('entry_date', [$start, $end])
                ->whereIn('status', ['draft', 'submitted'])
                ->count();

            $months[] = [
                'year'        => $year,
                'month'       => $month,
                'label'       => $cursor->format('M Y'),
                'status'      => $this->getMonthStatus($company, $year, $month, $firstMonth),
                'pendingDocs' => $pendingDocs,
                'pendingAJEs' => $pendingAJEs,
            ];

            $cursor->addMonth();
        }

        return $months;
    }

    public function preview(Company $company, int $year, int $month): array
    {
        // If already closed, nothing open remains — return zeros
        $alreadyClosed = PeriodClosing::where('company_id', $company->id)
            ->where('period_year', $year)
            ->where('period_month', $month)
            ->exists();

        if ($alreadyClosed) {
            return [
                'incomeGroup'  => [],
                'expenseGroup' => [],
                'totalIncome'  => 0.0,
                'totalExpense' => 0.0,
            ];
        }

        $start = Carbon::create($year, $month, 1)->startOfMonth();
        $end   = Carbon::create($year, $month, 1)->endOfMonth();

        $incomeGroup  = $this->aggregateLines($company, $start, $end, 'income');
        $expenseGroup = $this->aggregateLines($company, $start, $end, 'expense');

        return [
            'incomeGroup'  => $incomeGroup,
            'expenseGroup' => $expenseGroup,
            'totalIncome'  => collect($incomeGroup)->sum('amount'),
            'totalExpense' => collect($expenseGroup)->sum('amount'),
        ];
    }

    public function executeClose(Company $company, int $year, int $month, User $closedBy): PeriodClosing
    {
        $status = $this->getMonthStatus($company, $year, $month);

        if ($status === 'closed') {
            throw new \RuntimeException('This period is already closed.');
        }
        if ($status !== 'ready') {
            throw new \RuntimeException("Cannot close period: status is '{$status}'.");
        }

        return DB::transaction(function () use ($company, $year, $month, $closedBy) {
            // Re-verify inside the transaction so a document approved in the window between
            // the outer status check and this point cannot silently enter a closing entry.
            $innerStatus = $this->getMonthStatus($company, $year, $month);
            if ($innerStatus !== 'ready') {
                throw new \RuntimeException("Cannot close period: status is '{$innerStatus}'.");
            }

            $this->assertPreCloseConditions($company, $year, $month);

            $closing = new PeriodClosing([
                'company_id'   => $company->id,
                'period_year'  => $year,
                'period_month' => $month,
            ]);
            $closing->closed_by = $closedBy->id;
            $closing->closed_at = now();
            try {
                $closing->save();
            } catch (QueryException $e) {
                // Backstop for concurrent close requests that both pass the status guard above.
                // SQLSTATE 23505 = PostgreSQL unique violation; 23000 = MySQL/generic.
                if (in_array($e->getCode(), ['23505', '23000'])) {
                    throw new \RuntimeException('This period is already closed.');
                }
                throw $e;
            }

            $start     = Carbon::create($year, $month, 1)->startOfMonth();
            $end       = Carbon::create($year, $month, 1)->endOfMonth();
            $entryDate = $end->toDateString();

            $incomeGroup  = $this->aggregateLines($company, $start, $end, 'income');
            $expenseGroup = $this->aggregateLines($company, $start, $end, 'expense');

            $incomeSummary = $this->getOrCreateIncomeSummaryAccount($company);

            // JE 1: Close income accounts → Income Summary
            $je1 = JournalEntry::create([
                'company_id'        => $company->id,
                'period_closing_id' => $closing->id,
                'entry_date'        => $entryDate,
                'description'       => "Closing entry — income accounts ({$year}-{$month})",
                'status'            => 'posted',
                'posted_by'         => $closedBy->id,
                'posted_at'         => now(),
            ]);
            foreach ($incomeGroup as $line) {
                JournalEntryLine::create([
                    'journal_entry_id' => $je1->id,
                    'account_id'       => $line['accountId'],
                    'debit'            => $line['side'] === 'debit'  ? $line['amount'] : null,
                    'credit'           => $line['side'] === 'credit' ? $line['amount'] : null,
                ]);
            }
            // Credit Income Summary for normal case (net income)
            // Income Summary credit = sum of income where side=debit, minus sum where side=credit
            $incomeSummaryCredit = collect($incomeGroup)
                ->sum(fn($l) => $l['side'] === 'debit' ? $l['amount'] : -$l['amount']);
            if ($incomeSummaryCredit != 0) {
                JournalEntryLine::create([
                    'journal_entry_id' => $je1->id,
                    'account_id'       => $incomeSummary->id,
                    'debit'            => $incomeSummaryCredit < 0 ? abs($incomeSummaryCredit) : null,
                    'credit'           => $incomeSummaryCredit > 0 ? $incomeSummaryCredit : null,
                ]);
            }

            // JE 2: Close expense accounts → Income Summary
            $je2 = JournalEntry::create([
                'company_id'        => $company->id,
                'period_closing_id' => $closing->id,
                'entry_date'        => $entryDate,
                'description'       => "Closing entry — expense accounts ({$year}-{$month})",
                'status'            => 'posted',
                'posted_by'         => $closedBy->id,
                'posted_at'         => now(),
            ]);
            foreach ($expenseGroup as $line) {
                JournalEntryLine::create([
                    'journal_entry_id' => $je2->id,
                    'account_id'       => $line['accountId'],
                    'debit'            => $line['side'] === 'debit'  ? $line['amount'] : null,
                    'credit'           => $line['side'] === 'credit' ? $line['amount'] : null,
                ]);
            }
            $incomeSummaryDebit = collect($expenseGroup)
                ->sum(fn($l) => $l['side'] === 'credit' ? $l['amount'] : -$l['amount']);
            if ($incomeSummaryDebit != 0) {
                JournalEntryLine::create([
                    'journal_entry_id' => $je2->id,
                    'account_id'       => $incomeSummary->id,
                    'debit'            => $incomeSummaryDebit > 0 ? $incomeSummaryDebit : null,
                    'credit'           => $incomeSummaryDebit < 0 ? abs($incomeSummaryDebit) : null,
                ]);
            }

            // Tag all original posted JEs in the period with this closing's ID
            JournalEntry::where('company_id', $company->id)
                ->whereBetween('entry_date', [$start, $end])
                ->where('status', 'posted')
                ->whereNull('period_closing_id')
                ->update(['period_closing_id' => $closing->id]);

            $this->assertPostCloseIntegrity($je1, $je2, $company, $year, $month);

            return $closing;
        });
    }

    private function assertPreCloseConditions(Company $company, int $year, int $month): void
    {
        $start = Carbon::create($year, $month, 1)->startOfMonth();
        $end   = Carbon::create($year, $month, 1)->endOfMonth();

        $incomeSummary = Account::where('company_id', $company->id)
            ->where('name', 'Income Summary')
            ->first();

        if ($incomeSummary) {
            $baseQuery = JournalEntryLine::whereHas('journalEntry', function ($q) use ($company, $start, $end) {
                    $q->where('company_id', $company->id)
                      ->whereBetween('entry_date', [$start, $end])
                      ->whereNull('period_closing_id');
                })
                ->where('account_id', $incomeSummary->id);

            $totalCredit = (float) (clone $baseQuery)->sum('credit');
            $totalDebit  = (float) (clone $baseQuery)->sum('debit');
            $netBalance  = $totalCredit - $totalDebit;

            if (abs($netBalance) > 0.01) {
                throw new \RuntimeException(
                    "Income Summary account has a pre-existing balance of {$netBalance} — manual entries must be reversed before closing."
                );
            }
        }

        $draftCount = JournalEntry::where('company_id', $company->id)
            ->whereBetween('entry_date', [$start, $end])
            ->where('status', 'draft')
            ->count();

        if ($draftCount > 0) {
            $label = $draftCount === 1 ? 'entry' : 'entries';
            throw new \RuntimeException(
                "{$draftCount} journal {$label} in this period are still in draft and will be permanently locked. Post or delete them before closing."
            );
        }
    }

    private function assertPostCloseIntegrity(
        JournalEntry $je1,
        JournalEntry $je2,
        Company $company,
        int $year,
        int $month
    ): void {
        $start = Carbon::create($year, $month, 1)->startOfMonth();
        $end   = Carbon::create($year, $month, 1)->endOfMonth();

        foreach ([$je1->id, $je2->id] as $jeId) {
            $totalDebit  = (float) JournalEntryLine::where('journal_entry_id', $jeId)->sum('debit');
            $totalCredit = (float) JournalEntryLine::where('journal_entry_id', $jeId)->sum('credit');
            if (abs($totalDebit - $totalCredit) > 0.01) {
                throw new \RuntimeException(
                    "Closing entry {$jeId} is unbalanced (Dr {$totalDebit} ≠ Cr {$totalCredit}) — this is a system error."
                );
            }
        }

        $orphanCount = JournalEntry::where('company_id', $company->id)
            ->whereBetween('entry_date', [$start, $end])
            ->where('status', 'posted')
            ->whereNull('period_closing_id')
            ->count();

        if ($orphanCount > 0) {
            $label = $orphanCount === 1 ? 'entry' : 'entries';
            throw new \RuntimeException(
                "{$orphanCount} posted journal {$label} in this period were not captured by the closing — data integrity error."
            );
        }
    }

    private function aggregateLines(Company $company, Carbon $start, Carbon $end, string $accountType): array
    {
        $lines = JournalEntryLine::whereHas('journalEntry', function ($q) use ($company, $start, $end) {
            $q->where('company_id', $company->id)
              ->where('status', 'posted')
              ->whereNull('period_closing_id')
              ->whereBetween('entry_date', [$start, $end]);
        })
        ->whereHas('account', fn($q) => $q->where('type', $accountType))
        ->with('account')
        ->get();

        return $lines->groupBy('account_id')->map(function ($group) use ($accountType) {
            $account = $group->first()->account;
            // Net balance from the account's natural perspective
            $netBalance = $accountType === 'income'
                ? $group->sum('credit') - $group->sum('debit')   // income natural credit
                : $group->sum('debit')  - $group->sum('credit');  // expense natural debit

            if ($netBalance == 0) {
                return null;
            }

            // The closing entry must zero this account.
            // Income account with natural credit balance → Dr to close → side = 'debit'
            // Income account with abnormal debit balance → Cr to close → side = 'credit'
            // Expense account with natural debit balance → Cr to close → side = 'credit'
            // Expense account with abnormal credit balance → Dr to close → side = 'debit'
            if ($accountType === 'income') {
                $side = $netBalance > 0 ? 'debit' : 'credit';
            } else {
                $side = $netBalance > 0 ? 'credit' : 'debit';
            }

            return [
                'accountId'   => $account->id,
                'accountName' => $account->name,
                'accountCode' => $account->code,
                'amount'      => (float) abs($netBalance),
                'side'        => $side,
            ];
        })->filter()->values()->toArray();
    }

    private function getOrCreateIncomeSummaryAccount(Company $company): Account
    {
        return Account::firstOrCreate(
            ['company_id' => $company->id, 'name' => 'Income Summary'],
            ['code' => '3900', 'type' => 'equity']
        );
    }
}
