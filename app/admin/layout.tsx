'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { QrCode, Users, Trophy, LogOut, UserCircle, FileText, FileSpreadsheet, LayoutDashboard, ShieldCheck } from 'lucide-react';
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
    { name: 'Rekap Harian', href: '/admin/leaderboard', icon: LayoutDashboard },
    { name: 'Persetujuan', href: '/admin/attendance', icon: FileText },
    { name: 'Laporan Bulanan', href: '/admin/reports', icon: FileSpreadsheet },
    { name: 'Kelola User', href: '/admin/users', icon: Users },
    { name: 'Layar QR', href: '/admin/qr', icon: QrCode },
    { name: 'Scan Wajah', href: '/admin/face-attendance', icon: ShieldCheck },
  ];

  return (
    <div className="min-h-screen bg-white flex flex-col md:flex-row font-sans selection:bg-slate-100 text-slate-900">
      {/* Sidebar - Sharp Professional */}
      <aside className="w-full md:w-64 bg-slate-50 border-r border-slate-200 flex flex-col shrink-0">
        
        {/* Brand/Profile */}
        <div className="p-8 pb-6">
          <Link href="/profile" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-slate-900 flex items-center justify-center shrink-0">
              {userData?.avatar_url ? (
                <img src={userData.avatar_url} alt="Avatar" className="w-full h-full object-cover rounded" />
              ) : (
                <UserCircle className="text-white w-5 h-5" />
              )}
            </div>
            <div className="min-w-0">
              <h2 className="font-bold text-slate-900 text-sm truncate">{userData?.name || 'Admin'}</h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Administrator</p>
            </div>
          </Link>
        </div>

        {/* Global Nav */}
        <nav className="flex-1 px-4 py-4 space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-2.5 rounded text-xs font-bold transition-colors ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon size={16} strokeWidth={2.5} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Action Footer */}
        <div className="p-4 border-t border-slate-200">
          <button
            onClick={() => setIsLogoutModalOpen(true)}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors"
          >
            <LogOut size={16} />
            Keluar Sesi
          </button>
        </div>
      </aside>

      {/* Main Framework */}
      <main className="flex-1 p-8 md:p-12 bg-white overflow-y-auto">
        <div className="max-w-6xl mx-auto">
          {children}
        </div>
      </main>

      {/* Confirm Action Modal */}
      <ConfirmModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={handleLogout}
        variant="warning"
        title="Logout dari Panel Admin?"
        message="Sesi akses admin Anda akan berakhir dan Anda harus login kembali."
        confirmText="Keluar Sekarang"
      />
    </div>
  );
}
