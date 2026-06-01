<?php

namespace App\Services\Accounting;

use App\Models\Account;
use App\Models\AdjustingEntry;
use App\Models\Document;
use App\Models\JournalEntry;
use App\Models\JournalEntryLine;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class JournalEntryService
{
    public function postFromDocument(Document $doc, User $approvedBy): JournalEntry
    {
        return DB::transaction(function () use ($doc, $approvedBy) {
            $company = $doc->company;

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

            $entry = JournalEntry::create([
                'company_id'  => $company->id,
                'document_id' => $doc->id,
                'entry_date'  => $doc->document_date,
                'description' => "Document #{$doc->ref_number} — {$doc->merchant_name}",
                'status'      => 'posted',
                'posted_by'   => $approvedBy->id,
                'posted_at'   => now(),
            ]);

            $lines = $doc->transactionLines;

            $missing = $lines->firstWhere('account_id', null);
            if ($missing) {
                throw new \RuntimeException("Transaction line is missing an account assignment (line id: {$missing->id}).");
            }

            $totalIncome  = $lines->where('type', 'income')->sum('amount');
            $totalExpense = $lines->where('type', 'expense')->sum('amount');

            foreach ($lines as $line) {
                if ($line->type === 'income') {
                    JournalEntryLine::create([
                        'journal_entry_id'    => $entry->id,
                        'account_id'          => $line->account_id,
                        'transaction_line_id' => $line->id,
                        'debit'               => null,
                        'credit'              => $line->amount,
                    ]);
                } else {
                    JournalEntryLine::create([
                        'journal_entry_id'    => $entry->id,
                        'account_id'          => $line->account_id,
                        'transaction_line_id' => $line->id,
                        'debit'               => $line->amount,
                        'credit'              => null,
                    ]);
                }
            }

            $netCash = (float) $totalIncome - (float) $totalExpense;
            if ($netCash > 0) {
                JournalEntryLine::create([
                    'journal_entry_id' => $entry->id,
                    'account_id'       => $cashAccount->id,
                    'debit'            => $netCash,
                    'credit'           => null,
                ]);
            } elseif ($netCash < 0) {
                JournalEntryLine::create([
                    'journal_entry_id' => $entry->id,
                    'account_id'       => $cashAccount->id,
                    'debit'            => null,
                    'credit'           => abs($netCash),
                ]);
            }

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

            $journalEntry = JournalEntry::create([
                'company_id'         => $company->id,
                'adjusting_entry_id' => $entry->id,
                'entry_date'         => $entry->entry_date,
                'description'        => $entry->description ?? "Adjusting Entry #{$entry->ref_number}",
                'status'             => 'posted',
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

}
