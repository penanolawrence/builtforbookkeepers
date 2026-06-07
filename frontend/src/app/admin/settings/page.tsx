'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { me, updateProfile } from '@/lib/api/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'

const schema = z.object({
  name: z.string().min(1, 'Required'),
  email: z.string().email().optional().or(z.literal('')),
  mobile: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

export default function AdminSettingsPage() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const { data: user, isLoading } = useQuery({ queryKey: ['me'], queryFn: me })

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: user ? { name: user.name, email: user.email ?? '', mobile: user.mobile ?? '' } : undefined,
  })

  const onSubmit = async (data: FormValues) => {
    await updateProfile(data)
    toast({ title: 'Profile updated.' })
    queryClient.invalidateQueries({ queryKey: ['me'] })
  }

  if (isLoading) return <Skeleton className="h-48 w-full" />

  return (
    <div className="max-w-sm space-y-4">
      <h1 className="text-xl font-semibold">Settings</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1">
          <Label>Full Name</Label>
          <Input {...register('name')} />
          {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
        </div>
        <div className="space-y-1">
          <Label>Email</Label>
          <Input type="email" {...register('email')} />
        </div>
        <div className="space-y-1">
          <Label>Mobile</Label>
          <Input {...register('mobile')} />
        </div>
        <Button type="submit" disabled={isSubmitting}>Save</Button>
      </form>
    </div>
  )
}
