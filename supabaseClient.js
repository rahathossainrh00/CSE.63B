// ============================================
// 🔗 SUPABASE CLIENT CONFIGURATION
// ============================================

const SUPABASE_URL = 'https://etgvonekaspphivuniiy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV0Z3ZvbmVrYXNwcGhpdnVuaWl5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3NTczOTMsImV4cCI6MjA3NjMzMzM5M30.VDUlouLBIAtmznCkmHXsoecN-MRTUQhgN1m6zfdwtDk';

// Initialize Supabase client
let supabase;

function initSupabase() {
    if (!window.supabase) {
        console.error('Supabase library not loaded');
        return null;
    }
    
    const { createClient } = window.supabase;
    return createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

// Wait for Supabase library to load
if (window.supabase) {
    supabase = initSupabase();
} else {
    // Wait for it to load
    document.addEventListener('DOMContentLoaded', function() {
        setTimeout(() => {
            supabase = initSupabase();
        }, 100);
    });
}

// Auth helper functions
async function getCurrentUser() {
    if (!supabase) {
        supabase = initSupabase();
    }
    
    try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) {
            console.error('Error getting user:', error);
            return null;
        }
        return user;
    } catch (error) {
        console.error('Error in getCurrentUser:', error);
        return null;
    }
}

async function signIn(email, password) {
    if (!supabase) {
        supabase = initSupabase();
    }
    
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
    });
    
    if (error) {
        throw new Error(error.message);
    }
    
    return data;
}

async function signOut() {
    if (!supabase) {
        supabase = initSupabase();
    }
    
    const { error } = await supabase.auth.signOut();
    if (error) {
        throw new Error(error.message);
    }
}

function onAuthStateChange(callback) {
    if (!supabase) {
        supabase = initSupabase();
    }
    
    return supabase.auth.onAuthStateChange((event, session) => {
        callback(event, session);
    });
}
