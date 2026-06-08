'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { me, updateProfile } from '@/lib/api/auth'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'

const schema = z.object({
  name: z.string().min(1, 'Required'),
  email: z.string().email().optional().or(z.literal('')),
  mobile: z.string().optional(),
  tin: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

export default function ClientSettingsPage() {
  const { toast } = useToast()
  const { data: user } = useQuery({ queryKey: ['me'], queryFn: me })

  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  useEffect(() => {
    if (user) {
      reset({
        name: user.name ?? '',
        email: user.email ?? '',
        mobile: user.mobile ?? '',
        tin: user.tin ?? '',
      })
    }
  }, [user, reset])

  const onSubmit = async (values: FormValues) => {
    await updateProfile(values)
    toast({ title: 'Settings saved.' })
  }

  return (
    <div className="max-w-[1280px] mx-auto px-4 py-5 md:px-9 md:py-7">
      <div className="mb-[22px]">
        <h1
          className="text-[28px] md:text-[34px] font-bold tracking-[-0.025em] text-t-ink m-0"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Settings
        </h1>
        <p className="text-[14px] text-t-muted mt-1">Your account details</p>
      </div>

      <div className="max-w-md">
        <div className="bg-t-card border border-t-line rounded-2xl p-5 md:p-6 shadow-sm space-y-4">
          {user?.username && (
            <div className="space-y-1 pb-3 border-b border-t-line">
              <Label className="text-t-muted">Your login username</Label>
              <p className="text-sm font-semibold text-t-primary">{user.username}</p>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1">
              <Label>Full Name</Label>
              <Input {...register('name')} />
            </div>
            <div className="space-y-1">
              <Label>Email</Label>
              <Input type="email" {...register('email')} />
            </div>
            <div className="space-y-1">
              <Label>Mobile Number</Label>
              <Input {...register('mobile')} />
            </div>
            <div className="space-y-1">
              <Label>TIN</Label>
              <Input {...register('tin')} />
            </div>
            <Button type="submit" disabled={isSubmitting} className="w-full md:w-auto">
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
