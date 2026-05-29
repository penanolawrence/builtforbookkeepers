<?php

namespace App\Console\Commands;

use App\Models\Company;
use App\Models\Notification;
use App\Services\Notification\NotificationService;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;

class SendMorningNotifications extends Command
{
    protected $signature   = 'notifications:send-morning-batch';
    protected $description = 'Send consolidated daily in-app notification to clients with unresolved items.';

    public function handle(): void
    {
        $companies = Company::whereHas('documents', function ($q) {
            $q->whereIn('status', ['returned', 'rejected']);
        })->get();

        $manilaToday = Carbon::now('Asia/Manila')->startOfDay();

        foreach ($companies as $company) {
            $clientUser = $company->users()->where('role', 'client')->first();
            if (!$clientUser) continue;

            $alreadySent = Notification::where('user_id', $clientUser->id)
                ->where('type', 'morning_batch')
                ->where('created_at', '>=', $manilaToday->utc())
                ->exists();

            if ($alreadySent) continue;

            (new NotificationService())->sendClientMorningSms($company);
        }

        $this->info("Morning notifications sent.");
    }
}
