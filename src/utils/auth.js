import { getSupabase } from './supabase'

export const handleLogout = async (router) => {
  try {
    const supabase = getSupabase()
    
    // Clear any local storage items
    localStorage.removeItem('profileImage')
    
    // Sign out from Supabase
    const { error } = await supabase.auth.signOut()
    if (error) throw error

    // Force a router refresh to clear any cached data
    router.refresh()
    
    // Redirect to login page
    router.push('/login')
    
    return { success: true }
  } catch (error) {
    console.error('Error during logout:', error)
    return { 
      success: false, 
      error: error.message 
    }
  }
}

export const handleLogin = async (email, password, router) => {
  try {
    const supabase = getSupabase()
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    
    if (error) throw error
    
    // Force a router refresh to update the session
    router.refresh()
    router.push('/dashboard')
    
    return { success: true, data }
  } catch (error) {
    console.error('Error during login:', error)
    return { 
      success: false, 
      error: error.message 
    }
  }
}

export const handleRegister = async (email, password, username, router) => {
  try {
    const supabase = getSupabase()
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: username,
        },
        emailRedirectTo: `${window.location.origin}/login`
      }
    })
    
    if (error) throw error
    
    return { 
      success: true, 
      data,
      message: 'Registration successful! Please check your email to confirm your account.'
    }
  } catch (error) {
    console.error('Error during registration:', error)
    return { 
      success: false, 
      error: error.message 
    }
  }
}

export const handlePasswordReset = async (email) => {
  try {
    const supabase = getSupabase()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    
    if (error) throw error
    
    return { 
      success: true,
      message: 'Password reset instructions have been sent to your email.'
    }
  } catch (error) {
    console.error('Error during password reset:', error)
    return { 
      success: false, 
      error: error.message 
    }
  }
}

export const handlePasswordUpdate = async (newPassword) => {
  try {
    const supabase = getSupabase()
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    })
    
    if (error) throw error
    
    return { 
      success: true,
      message: 'Password updated successfully.'
    }
  } catch (error) {
    console.error('Error updating password:', error)
    return { 
      success: false, 
      error: error.message 
    }
  }
}

export const checkAuth = async () => {
  try {
    const supabase = getSupabase()
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error) throw error
    
    return { 
      isAuthenticated: !!session,
      session 
    }
  } catch (error) {
    console.error('Error checking auth:', error)
    return { 
      isAuthenticated: false,
      error: error.message 
    }
  }
} 