import { createClient } from '@/lib/supabase/server'
import { Navbar } from '@/components/ui/navbar'

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  let profile = null
  let isAdmin = false

  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    profile = data

    // Check if user is admin/teacher of any group
    const { data: membership } = await supabase
      .from('group_memberships')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['admin', 'teacher'])
      .eq('is_active', true)
      .limit(1)
      .maybeSingle()

    isAdmin = !!membership
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar profile={profile} isAdmin={isAdmin} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  )
}
