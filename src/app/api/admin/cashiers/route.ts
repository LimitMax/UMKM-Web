import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

interface CashierBody {
  name?: string;
  email?: string;
  password?: string;
}

// GET all cashiers associated with the caller's business
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();

    if (!token) {
      return NextResponse.json({ message: 'Sesi login tidak ditemukan.' }, { status: 401 });
    }

    const supabaseAdmin = createSupabaseAdminClient();
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !userData.user) {
      return NextResponse.json({ message: 'Sesi login tidak valid.' }, { status: 401 });
    }

    // Get admin profile
    const { data: adminProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role, business_id')
      .eq('id', userData.user.id)
      .maybeSingle();

    if (profileError || !adminProfile) {
      return NextResponse.json({ message: 'Profil admin tidak ditemukan.' }, { status: 403 });
    }

    if (adminProfile.role !== 'admin') {
      return NextResponse.json({ message: 'Hanya admin yang dapat mengelola kasir.' }, { status: 403 });
    }

    // Fetch cashiers for this business
    const { data: cashiers, error: fetchError } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, email, role, created_at')
      .eq('business_id', adminProfile.business_id)
      .eq('role', 'cashier')
      .order('created_at', { ascending: false });

    if (fetchError) {
      console.error('[Admin Cashiers API] Failed to fetch cashiers:', fetchError);
      return NextResponse.json({ message: 'Gagal memuat daftar kasir.' }, { status: 550 });
    }

    return NextResponse.json({ cashiers });
  } catch (error) {
    console.error('[Admin Cashiers API] GET Error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

// POST to create a new cashier
export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();

    if (!token) {
      return NextResponse.json({ message: 'Sesi login tidak ditemukan.' }, { status: 401 });
    }

    const supabaseAdmin = createSupabaseAdminClient();
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !userData.user) {
      return NextResponse.json({ message: 'Sesi login tidak valid.' }, { status: 401 });
    }

    // Get admin profile
    const { data: adminProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role, business_id')
      .eq('id', userData.user.id)
      .maybeSingle();

    if (profileError || !adminProfile) {
      return NextResponse.json({ message: 'Profil admin tidak ditemukan.' }, { status: 403 });
    }

    if (adminProfile.role !== 'admin') {
      return NextResponse.json({ message: 'Hanya admin yang dapat mengelola kasir.' }, { status: 403 });
    }

    const body = (await request.json().catch(() => null)) as CashierBody | null;
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body?.password === 'string' ? body.password : '';

    if (!name || !email || !password) {
      return NextResponse.json({ message: 'Nama, email, dan kata sandi wajib diisi.' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ message: 'Kata sandi minimal harus 6 karakter.' }, { status: 400 });
    }

    // Check cashier limit (unless developer bypass)
    const DEVELOPER_EMAILS = (process.env.NEXT_PUBLIC_DEVELOPER_EMAILS || '')
      .split(',')
      .map((em) => em.trim().toLowerCase())
      .filter(Boolean);
    const isDeveloperAccount = Boolean(
      userData.user.email && DEVELOPER_EMAILS.includes(userData.user.email.toLowerCase())
    );

    if (!isDeveloperAccount) {
      // Fetch plan code and cashier limit
      const { data: business } = await supabaseAdmin
        .from('businesses')
        .select('plan_code')
        .eq('id', adminProfile.business_id)
        .maybeSingle();

      const planCode = business?.plan_code || 'free';
      
      const { data: plan } = await supabaseAdmin
        .from('plans')
        .select('cashier_limit')
        .eq('code', planCode)
        .maybeSingle();

      const maxLimit = plan?.cashier_limit ?? 1;

      // Count existing cashiers
      const { count } = await supabaseAdmin
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('business_id', adminProfile.business_id)
        .eq('role', 'cashier');

      const existingCount = count || 0;
      if (existingCount >= maxLimit) {
        return NextResponse.json({
          message: `Jumlah kasir telah mencapai limit paket Anda (${maxLimit} kasir). Silakan upgrade paket langganan Anda.`
        }, { status: 400 });
      }
    }

    // Create user via Admin client in Supabase Auth
    const { data: newUser, error: createAuthError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: name }
    });

    if (createAuthError || !newUser.user) {
      console.error('[Admin Cashiers API] Auth signup failed:', createAuthError);
      return NextResponse.json({ message: createAuthError?.message || 'Gagal mendaftarkan akun auth kasir.' }, { status: 400 });
    }

    // Create profile
    const { data: profile, error: createProfileError } = await supabaseAdmin
      .from('profiles')
      .insert([
        {
          id: newUser.user.id,
          business_id: adminProfile.business_id,
          full_name: name,
          email,
          role: 'cashier',
        }
      ])
      .select()
      .single();

    if (createProfileError) {
      console.error('[Admin Cashiers API] Profile creation failed:', createProfileError);
      // Clean up user from auth to prevent orphaned accounts
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
      return NextResponse.json({ message: 'Gagal membuat data profil kasir.' }, { status: 500 });
    }

    return NextResponse.json({ profile });
  } catch (error) {
    console.error('[Admin Cashiers API] POST Error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE to remove a cashier
export async function DELETE(request: Request) {
  try {
    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();

    if (!token) {
      return NextResponse.json({ message: 'Sesi login tidak ditemukan.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const cashierId = searchParams.get('id')?.trim();

    if (!cashierId) {
      return NextResponse.json({ message: 'ID kasir wajib dicantumkan.' }, { status: 400 });
    }

    const supabaseAdmin = createSupabaseAdminClient();
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !userData.user) {
      return NextResponse.json({ message: 'Sesi login tidak valid.' }, { status: 401 });
    }

    // Get admin profile
    const { data: adminProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role, business_id')
      .eq('id', userData.user.id)
      .maybeSingle();

    if (profileError || !adminProfile) {
      return NextResponse.json({ message: 'Profil admin tidak ditemukan.' }, { status: 403 });
    }

    if (adminProfile.role !== 'admin') {
      return NextResponse.json({ message: 'Hanya admin yang dapat mengelola kasir.' }, { status: 403 });
    }

    // Verify cashier belongs to this business
    const { data: cashierProfile, error: verifyError } = await supabaseAdmin
      .from('profiles')
      .select('role, business_id')
      .eq('id', cashierId)
      .maybeSingle();

    if (verifyError || !cashierProfile) {
      return NextResponse.json({ message: 'Data kasir tidak ditemukan.' }, { status: 404 });
    }

    if (cashierProfile.business_id !== adminProfile.business_id || cashierProfile.role !== 'cashier') {
      return NextResponse.json({ message: 'Anda tidak memiliki hak untuk menghapus kasir ini.' }, { status: 403 });
    }

    // Delete user from auth (this will cascade delete profiles if postgres schema has cascade,
    // or we delete profile row explicitly)
    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(cashierId);
    if (deleteAuthError) {
      console.error('[Admin Cashiers API] Auth delete failed:', deleteAuthError);
    }

    const { error: deleteProfileError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', cashierId);

    if (deleteProfileError) {
      console.error('[Admin Cashiers API] Profile delete failed:', deleteProfileError);
      return NextResponse.json({ message: 'Gagal menghapus data profil kasir.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Kasir berhasil dihapus.' });
  } catch (error) {
    console.error('[Admin Cashiers API] DELETE Error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
