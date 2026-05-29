<?php

namespace App\Services\Accounting;

use App\Models\Account;
use App\Models\AdjustingEntry;
use App\Models\Document;
use App\Models\JournalEntry;
use App\Models\JournalEntryLine;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class JournalEntryService
{
    public function postFromDocument(Document $doc, User $approvedBy): JournalEntry
    {
        return DB::transaction(function () use ($doc, $approvedBy) {
            $company   = $doc->company;
            $isVat     = $company->bir_type === 'vat';
            $type      = $doc->document_type;
            $isPast    = Carbon::parse($doc->document_date)->lt(Carbon::now()->startOfMonth());

            $cashAccountMap = [
                'cash'  => 'Cash on Hand',
                'gcash' => 'GCash',
                'maya'  => 'Maya',
                'bank'  => 'Bank',
            ];
            $cashName    = $cashAccountMap[$doc->payment_method] ?? 'Cash on Hand';
            $cashAccount = Account::where('company_id', $company->id)
                ->where('name', $cashName)
                ->where('type', 'cash')
                ->first();

            if (!$cashAccount) {
                throw new \RuntimeException("Cash account '{$cashName}' not found for company {$company->id}");
            }

            $txAccount = Account::where('company_id', $company->id)
                ->where('id', $doc->account_id)
                ->first();

            if (!$txAccount) {
                throw new \RuntimeException("Transaction account not found for document {$doc->id}");
            }

            $inputVatAccount = $outputVatAccount = null;
            if ($isVat) {
                $inputVatAccount  = Account::where('company_id', $company->id)->where('code', '1101')->first();
                $outputVatAccount = Account::where('company_id', $company->id)->where('code', '2101')->first();
            }

            $entry = JournalEntry::create([
                'company_id'      => $company->id,
                'document_id'     => $doc->id,
                'entry_date'      => $doc->document_date,
                'description'     => "Document #{$doc->ref_number} — {$doc->merchant_name}",
                'is_past_period'  => $isPast,
                'posted_by'       => $approvedBy->id,
                'posted_at'       => now(),
            ]);

            $netAmount   = (float)$doc->amount - (float)($doc->vat_amount ?? 0);
            $grossAmount = (float)$doc->amount;
            $vatAmount   = (float)($doc->vat_amount ?? 0);

            $this->createLines($entry, $isVat, $type, $txAccount, $cashAccount, $inputVatAccount, $outputVatAccount, $netAmount, $grossAmount, $vatAmount);

            return $entry;
        });
    }

    public function previewFromDocument(Document $doc): array
    {
        $company   = $doc->company;
        $isVat     = $company->bir_type === 'vat';
        $type      = $doc->document_type;

        $cashAccountMap = [
            'cash'  => 'Cash on Hand',
            'gcash' => 'GCash',
            'maya'  => 'Maya',
            'bank'  => 'Bank',
        ];
        $cashName    = $cashAccountMap[$doc->payment_method] ?? 'Cash on Hand';
        $cashAccount = Account::where('company_id', $company->id)
            ->where('name', $cashName)
            ->where('type', 'cash')
            ->first();

        if (!$cashAccount) {
            throw new \RuntimeException("Cash account '{$cashName}' not found for company {$company->id}");
        }

        $txAccount = Account::where('company_id', $company->id)
            ->where('id', $doc->account_id)
            ->first();

        if (!$txAccount) {
            throw new \RuntimeException("Transaction account not found for document {$doc->id}");
        }

        $inputVatAccount = $outputVatAccount = null;
        if ($isVat) {
            $inputVatAccount  = Account::where('company_id', $company->id)->where('code', '1101')->first();
            $outputVatAccount = Account::where('company_id', $company->id)->where('code', '2101')->first();
        }

        $netAmount   = (float)$doc->amount - (float)($doc->vat_amount ?? 0);
        $grossAmount = (float)$doc->amount;
        $vatAmount   = (float)($doc->vat_amount ?? 0);

        $lines = [];

        if ($isVat && $type === 'expense') {
            $lines[] = ['accountCode' => $txAccount->code,         'accountName' => $txAccount->name,         'side' => 'debit',  'amount' => $netAmount];
            $lines[] = ['accountCode' => $inputVatAccount?->code,  'accountName' => $inputVatAccount?->name,  'side' => 'debit',  'amount' => $vatAmount];
            $lines[] = ['accountCode' => $cashAccount->code,       'accountName' => $cashAccount->name,       'side' => 'credit', 'amount' => $grossAmount];
        } elseif ($isVat && $type === 'income') {
            $lines[] = ['accountCode' => $cashAccount->code,        'accountName' => $cashAccount->name,        'side' => 'debit',  'amount' => $grossAmount];
            $lines[] = ['accountCode' => $txAccount->code,          'accountName' => $txAccount->name,          'side' => 'credit', 'amount' => $netAmount];
            $lines[] = ['accountCode' => $outputVatAccount?->code,  'accountName' => $outputVatAccount?->name,  'side' => 'credit', 'amount' => $vatAmount];
        } elseif (!$isVat && $type === 'expense') {
            $lines[] = ['accountCode' => $txAccount->code,   'accountName' => $txAccount->name,   'side' => 'debit',  'amount' => $grossAmount];
            $lines[] = ['accountCode' => $cashAccount->code, 'accountName' => $cashAccount->name, 'side' => 'credit', 'amount' => $grossAmount];
        } else {
            // non-VAT income
            $lines[] = ['accountCode' => $cashAccount->code, 'accountName' => $cashAccount->name, 'side' => 'debit',  'amount' => $grossAmount];
            $lines[] = ['accountCode' => $txAccount->code,   'accountName' => $txAccount->name,   'side' => 'credit', 'amount' => $grossAmount];
        }

        return $lines;
    }

    public function postFromAdjustingEntry(AdjustingEntry $entry, User $approvedBy): JournalEntry
    {
        return DB::transaction(function () use ($entry, $approvedBy) {
            $company = $entry->company;
            $isPast  = Carbon::parse($entry->entry_date)->lt(Carbon::now()->startOfMonth());

            $journalEntry = JournalEntry::create([
                'company_id'         => $company->id,
                'adjusting_entry_id' => $entry->id,
                'entry_date'         => $entry->entry_date,
                'description'        => $entry->description ?? "Adjusting Entry #{$entry->ref_number}",
                'is_past_period'     => $isPast,
                'posted_by'          => $approvedBy->id,
                'posted_at'          => now(),
            ]);

            foreach ($entry->lines as $line) {
                JournalEntryLine::create([
                    'journal_entry_id' => $journalEntry->id,
                    'account_id'       => $line->account_id,
                    'debit'            => $line->debit ?: null,
                    'credit'           => $line->credit ?: null,
                ]);
            }

            return $journalEntry;
        });
    }

    private function createLines(
        JournalEntry $entry,
        bool $isVat,
        string $type,
        Account $txAccount,
        Account $cashAccount,
        ?Account $inputVatAccount,
        ?Account $outputVatAccount,
        float $netAmount,
        float $grossAmount,
        float $vatAmount,
    ): void {
        if ($isVat && $type === 'expense') {
            JournalEntryLine::create(['journal_entry_id' => $entry->id, 'account_id' => $txAccount->id,        'debit' => $netAmount,   'credit' => null]);
            JournalEntryLine::create(['journal_entry_id' => $entry->id, 'account_id' => $inputVatAccount->id,  'debit' => $vatAmount,   'credit' => null]);
            JournalEntryLine::create(['journal_entry_id' => $entry->id, 'account_id' => $cashAccount->id,      'debit' => null,         'credit' => $grossAmount]);
        } elseif ($isVat && $type === 'income') {
            JournalEntryLine::create(['journal_entry_id' => $entry->id, 'account_id' => $cashAccount->id,      'debit' => $grossAmount, 'credit' => null]);
            JournalEntryLine::create(['journal_entry_id' => $entry->id, 'account_id' => $txAccount->id,        'debit' => null,         'credit' => $netAmount]);
            JournalEntryLine::create(['journal_entry_id' => $entry->id, 'account_id' => $outputVatAccount->id, 'debit' => null,         'credit' => $vatAmount]);
        } elseif (!$isVat && $type === 'expense') {
            JournalEntryLine::create(['journal_entry_id' => $entry->id, 'account_id' => $txAccount->id,   'debit' => $grossAmount, 'credit' => null]);
            JournalEntryLine::create(['journal_entry_id' => $entry->id, 'account_id' => $cashAccount->id, 'debit' => null,         'credit' => $grossAmount]);
        } else {
            // non-VAT income
            JournalEntryLine::create(['journal_entry_id' => $entry->id, 'account_id' => $cashAccount->id, 'debit' => $grossAmount, 'credit' => null]);
            JournalEntryLine::create(['journal_entry_id' => $entry->id, 'account_id' => $txAccount->id,   'debit' => null,         'credit' => $grossAmount]);
        }
    }
}
