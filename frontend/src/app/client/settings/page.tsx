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
    <div className="space-y-4 max-w-md">
      <h1 className="text-xl font-semibold">Settings</h1>

      {user?.username && (
        <div className="space-y-1">
          <Label>Your login username</Label>
          <p className="text-sm text-muted-foreground">{user.username}</p>
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
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : 'Save Changes'}
        </Button>
      </form>
    </div>
  )
}
