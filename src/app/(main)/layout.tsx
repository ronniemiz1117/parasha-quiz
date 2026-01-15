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
    // Try to fetch profile
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (data) {
      profile = data
    } else {
      // Profile doesn't exist - create it (trigger may not have run)
      const displayName = user.user_metadata?.display_name || user.email?.split('@')[0] || 'User'
      const { data: newProfile } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          email: user.email,
          display_name: displayName,
        })
        .select()
        .single()

      if (newProfile) {
        profile = newProfile
        // Also create user_stats if missing
        await supabase
          .from('user_stats')
          .insert({ user_id: user.id })
      } else {
        // If insert failed too, create a minimal profile object for display
        profile = {
          id: user.id,
          email: user.email,
          display_name: displayName,
        }
      }
    }

    // Check if user signed up as admin (from user metadata)
    const signupType = user.user_metadata?.signup_type
    if (signupType === 'admin') {
      isAdmin = true
    } else {
      // Also check if user is admin/teacher of any group
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
