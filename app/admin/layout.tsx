'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { QrCode, Users, Trophy, LogOut, UserCircle, FileText } from 'lucide-react';
import ConfirmModal from '@/components/ConfirmModal';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [userData, setUserData] = useState<{name: string, email: string, avatar_url?: string} | null>(null);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    async function getUser() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from('users').select('name, avatar_url').eq('id', user.id).single();
        setUserData({
          name: profile?.name || user.email || '',
          email: user.email || '',
          avatar_url: profile?.avatar_url
        });
      }
    }
    getUser();
  }, []);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  }

  const navItems = [
    { name: 'Layar QR Code', href: '/admin/qr', icon: QrCode },
    { name: 'Kelola User', href: '/admin/users', icon: Users },
    { name: 'Kelola Presensi', href: '/admin/attendance', icon: FileText },
    { name: 'Leaderboard', href: '/admin/leaderboard', icon: Trophy },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans selection:bg-slate-200">
      {/* Sidebar for Desktop / Navbar for Mobile */}
      <aside className="w-full md:w-64 bg-white border-b md:border-b-0 md:border-r border-slate-200 flex flex-col shrink-0">
        
        {/* Brand/Profile Head */}
        <div className="p-6">
          <Link href="/profile" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="w-10 h-10 ring-2 ring-slate-100 rounded-xl overflow-hidden bg-slate-50 flex items-center justify-center shrink-0">
              {userData?.avatar_url ? (
                <img src={userData.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <UserCircle className="text-slate-300 w-8 h-8" />
              )}
            </div>
            <div className="min-w-0">
              <h2 className="font-bold text-slate-900 text-sm truncate leading-tight">{userData?.name || 'Admin'}</h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Dashboard</p>
            </div>
          </Link>
        </div>

        {/* Navigation Section */}
        <nav className="flex-1 px-4 py-2 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-lg shadow-slate-200'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Footer/Logout */}
        <div className="p-4 border-t border-slate-100">
          <button
            onClick={() => setIsLogoutModalOpen(true)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-rose-500 hover:bg-rose-50 transition-all active:scale-95"
          >
            <LogOut size={18} />
            Keluar Sistem
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-6 md:p-10 overflow-y-auto">
        <div className="max-w-6xl mx-auto">
          {children}
        </div>
      </main>

      {/* Confirm Logout Modal */}
      <ConfirmModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={handleLogout}
        variant="warning"
        title="Logout dari Panel Admin?"
        message="Sesi akses admin Anda akan berakhir. Pastikan semua perubahan sudah tersimpan."
        confirmText="Ya, Keluar"
      />
    </div>
  );
}
