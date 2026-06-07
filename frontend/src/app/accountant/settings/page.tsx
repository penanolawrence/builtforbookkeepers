'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { me, updateProfile } from '@/lib/api/auth'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'

interface FormValues {
  name:   string
  email:  string
  mobile: string
}

export default function AccountantSettingsPage() {
  const [saved, setSaved] = useState(false)
  const { data: user } = useQuery({ queryKey: ['me'], queryFn: me })

  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<FormValues>({
    defaultValues: { name: '', email: '', mobile: '' },
  })

  useEffect(() => {
    if (user) reset({ name: user.name, email: user.email ?? '', mobile: user.mobile ?? '' })
  }, [user, reset])

  const onSubmit = async (values: FormValues) => {
    await updateProfile(values)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="max-w-[1100px] mx-auto p-6">
      <div className="mb-5">
        <div className="text-lg font-bold text-t-ink tracking-tight">Settings</div>
        <div className="text-xs text-t-faint mt-0.5">Your profile information</div>
      </div>

      {saved && (
        <div className="mb-4 px-3.5 py-2.5 bg-green-50 border border-green-200 rounded-lg text-xs text-green-700 font-medium">
          Settings saved.
        </div>
      )}

      <div className="bg-t-card border border-t-line rounded-lg p-6 max-w-[480px]">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-t-muted mb-1.5">Full Name</label>
            <input
              {...register('name')}
              className="w-full border-[1.5px] border-t-line rounded-lg px-3 py-2 text-sm text-t-ink outline-none focus:border-t-primary focus:ring-2 focus:ring-t-primary-soft transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-t-muted mb-1.5">Email</label>
            <input
              type="email"
              {...register('email')}
              className="w-full border-[1.5px] border-t-line rounded-lg px-3 py-2 text-sm text-t-ink outline-none focus:border-t-primary focus:ring-2 focus:ring-t-primary-soft transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-t-muted mb-1.5">Mobile Number</label>
            <input
              type="tel"
              {...register('mobile')}
              className="w-full border-[1.5px] border-t-line rounded-lg px-3 py-2 text-sm text-t-ink outline-none focus:border-t-primary focus:ring-2 focus:ring-t-primary-soft transition-colors"
            />
            <p className="text-[11px] text-t-faint mt-1">Used for account recovery and notifications</p>
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-t-primary hover:bg-t-primary-deep disabled:opacity-60 text-white text-xs font-semibold px-4 py-2 rounded-md transition-colors"
          >
            {isSubmitting ? 'Saving…' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  )
}
