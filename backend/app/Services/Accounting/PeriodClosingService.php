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
use Illuminate\Support\Facades\DB;

class PeriodClosingService
{
    /** Returns 'closed' | 'ready' | 'blocked' | 'future' */
    public function getMonthStatus(Company $company, int $year, int $month): string
    {
        if (PeriodClosing::where('company_id', $company->id)
            ->where('period_year', $year)
            ->where('period_month', $month)
            ->exists()) {
            return 'closed';
        }

        $firstMonth = $this->getFirstCloseableMonth($company);
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
        $first = JournalEntry::where('company_id', $company->id)
            ->where('status', 'posted')
            ->whereNull('period_closing_id')
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
                'status'      => $this->getMonthStatus($company, $year, $month),
                'pendingDocs' => $pendingDocs,
                'pendingAJEs' => $pendingAJEs,
            ];

            $cursor->addMonth();
        }

        return $months;
    }

    public function preview(Company $company, int $year, int $month): array
    {
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
            $closing = new PeriodClosing([
                'company_id'   => $company->id,
                'period_year'  => $year,
                'period_month' => $month,
            ]);
            $closing->closed_by = $closedBy->id;
            $closing->closed_at = now();
            $closing->save();

            $start     = Carbon::create($year, $month, 1)->startOfMonth();
            $end       = Carbon::create($year, $month, 1)->endOfMonth();
            $entryDate = $end->toDateString();

            $incomeGroup  = $this->aggregateLines($company, $start, $end, 'income');
            $expenseGroup = $this->aggregateLines($company, $start, $end, 'expense');

            $totalIncome  = collect($incomeGroup)->sum('amount');
            $totalExpense = collect($expenseGroup)->sum('amount');

            $incomeSummary = $this->getOrCreateIncomeSummaryAccount($company);

            // JE 1: Dr income accounts → Cr Income Summary
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
                    'debit'            => $line['amount'],
                    'credit'           => null,
                ]);
            }
            JournalEntryLine::create([
                'journal_entry_id' => $je1->id,
                'account_id'       => $incomeSummary->id,
                'debit'            => null,
                'credit'           => $totalIncome,
            ]);

            // JE 2: Dr Income Summary → Cr expense accounts
            $je2 = JournalEntry::create([
                'company_id'        => $company->id,
                'period_closing_id' => $closing->id,
                'entry_date'        => $entryDate,
                'description'       => "Closing entry — expense accounts ({$year}-{$month})",
                'status'            => 'posted',
                'posted_by'         => $closedBy->id,
                'posted_at'         => now(),
            ]);
            JournalEntryLine::create([
                'journal_entry_id' => $je2->id,
                'account_id'       => $incomeSummary->id,
                'debit'            => $totalExpense,
                'credit'           => null,
            ]);
            foreach ($expenseGroup as $line) {
                JournalEntryLine::create([
                    'journal_entry_id' => $je2->id,
                    'account_id'       => $line['accountId'],
                    'debit'            => null,
                    'credit'           => $line['amount'],
                ]);
            }

            return $closing;
        });
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
            $balance = $accountType === 'income'
                ? $group->sum('credit') - $group->sum('debit')
                : $group->sum('debit')  - $group->sum('credit');

            return [
                'accountId'   => $account->id,
                'accountName' => $account->name,
                'accountCode' => $account->code,
                'amount'      => (float) $balance,
            ];
        })->values()->filter(fn($item) => $item['amount'] > 0)->values()->toArray();
    }

    private function getOrCreateIncomeSummaryAccount(Company $company): Account
    {
        return Account::firstOrCreate(
            ['company_id' => $company->id, 'name' => 'Income Summary'],
            ['code' => '3900', 'type' => 'equity']
        );
    }
}
