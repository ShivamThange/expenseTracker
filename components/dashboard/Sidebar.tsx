'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useSession } from 'next-auth/react';
import { cn } from '@/lib/utils';
import { LayoutGrid, Share2, Banknote, ScrollText, ArrowLeftRight, Settings, LogOut, ChevronUp, Download } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

const navItems = [
  { href: '/dashboard', label: 'Overview', icon: LayoutGrid },
  { href: '/dashboard/groups', label: 'Groups', icon: Share2 },
  { href: '/dashboard/expenses', label: 'Expenses', icon: Banknote },
  { href: '/dashboard/history', label: 'History', icon: ScrollText },
  { href: '/dashboard/balances', label: 'Balances', icon: ArrowLeftRight },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const user = session?.user;
  const initials = user?.name?.split(' ').map((n) => n[0]).join('').toUpperCase() ?? '?';

  const deferredPrompt = useRef<any>(null);
  const [showInstall, setShowInstall] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      deferredPrompt.current = e;
      setShowInstall(true);
    };

    const handleAppInstalled = () => {
      setShowInstall(false);
      deferredPrompt.current = null;
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt.current) {
      deferredPrompt.current.prompt();
      const { outcome } = await deferredPrompt.current.userChoice;
      if (outcome === 'accepted') {
        setShowInstall(false);
      }
      deferredPrompt.current = null;
    }
  };

  return (
    <>
      {/* ── Desktop sidebar ─────────────────────────────── */}
      <aside className="hidden lg:flex lg:flex-col w-60 xl:w-64 h-screen overflow-hidden border-r border-border/40 bg-background shrink-0 fixed left-0 top-0">

        {/* Brand */}
        <div className="h-16 flex items-center px-5 border-b border-border/40 shrink-0">
          <Link href="/dashboard" className="flex items-center gap-2.5 group">
            <div className="w-7 h-7 rounded-md shrink-0 bg-primary flex items-center justify-center animate-glow-pulse">
              <span className="text-primary-foreground font-black text-[11px] tracking-tight">ET</span>
            </div>
            <span className="font-display font-bold italic text-sm text-foreground tracking-tight">
              Expense Tracker
            </span>
          </Link>
        </div>

        {/* Nav - scrollable */}
        <nav className="flex-1 min-h-0 overflow-y-auto px-3 pt-5 space-y-0.5">
          <p className="text-[9px] font-bold tracking-widest text-muted-foreground/60 uppercase px-2 mb-3">Navigation</p>
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all relative overflow-hidden group',
                  isActive
                    ? 'bg-primary/10 text-primary nav-active-shine'
                    : 'text-muted-foreground hover:bg-white/4 hover:text-foreground'
                )}
              >
                {isActive && (
                  <div className="absolute left-0 top-[15%] bottom-[15%] w-[3px] rounded-r-full bg-primary"
                    style={{ boxShadow: '0 0 8px rgba(240,112,64,0.6)' }} />
                )}
                <item.icon className={cn('w-4 h-4 shrink-0 transition-colors', isActive ? 'text-primary' : 'text-muted-foreground/70 group-hover:text-foreground')} />
                <span className={cn('font-semibold', isActive ? 'text-primary' : '')}>{item.label}</span>
              </Link>
            );
          })}
          {showInstall && (
            <Button
              onClick={handleInstall}
              className="w-full neon-glow mt-4 rounded-lg font-bold text-xs h-9 gap-2"
            >
              <Download className="w-3.5 h-3.5" />
              Install App
            </Button>
          )}
        </nav>

        {/* User footer - fixed at bottom */}
        <div className="p-3 space-y-3 pb-4 border-t border-border/40 shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger render={
              <button className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg hover:bg-white/4 transition-colors text-left border border-transparent hover:border-border/40 group">
                <Avatar className="h-8 w-8 rounded-lg ring-1 ring-primary/30 group-hover:ring-primary/60 transition-all shrink-0">
                  <AvatarImage src={user?.image ?? ''} />
                  <AvatarFallback className="text-[11px] bg-primary/15 text-primary font-bold rounded-lg inline-flex items-center justify-center">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate leading-tight">{user?.name}</p>
                  <p className="text-[10px] text-muted-foreground truncate leading-tight mt-0.5">{user?.email}</p>
                </div>
                <ChevronUp className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
              </button>
            } />
            <DropdownMenuContent align="end" className="w-52 bg-card border-border/50 rounded-xl shadow-xl">
              <DropdownMenuItem onClick={() => window.location.href = '/dashboard/settings'} className="text-xs font-semibold focus:bg-white/5 cursor-pointer py-2.5 rounded-lg">
                <Settings className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-border/40" />
              <DropdownMenuItem onClick={() => signOut({ callbackUrl: '/' })} className="text-xs font-semibold text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer py-2.5 rounded-lg">
                <LogOut className="w-3.5 h-3.5 mr-2" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* ── Mobile user menu ─────────────────────────────── */}
      <div className="lg:hidden fixed top-0 right-0 z-50 p-3">
        <DropdownMenu>
          <DropdownMenuTrigger render={
            <button className="flex items-center justify-center h-10 w-10 rounded-lg hover:bg-white/4 transition-colors border border-transparent hover:border-border/40">
              <Avatar className="h-8 w-8 rounded-lg ring-1 ring-primary/30 hover:ring-primary/60 transition-all">
                <AvatarImage src={user?.image ?? ''} />
                <AvatarFallback className="text-[11px] bg-primary/15 text-primary font-bold rounded-lg inline-flex items-center justify-center">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </button>
          } />
          <DropdownMenuContent align="end" className="w-48 bg-card border-border/50 rounded-xl shadow-xl">
            <div className="px-3 py-2 text-[10px] text-muted-foreground border-b border-border/40">
              <p className="text-xs font-semibold text-foreground truncate">{user?.name}</p>
              <p className="text-[10px] text-muted-foreground truncate mt-0.5">{user?.email}</p>
            </div>
            <DropdownMenuItem onClick={() => window.location.href = '/dashboard/settings'} className="text-xs font-semibold focus:bg-white/5 cursor-pointer py-2.5 rounded-lg">
              <Settings className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-border/40" />
            <DropdownMenuItem onClick={() => signOut({ callbackUrl: '/' })} className="text-xs font-semibold text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer py-2.5 rounded-lg">
              <LogOut className="w-3.5 h-3.5 mr-2" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* ── Mobile bottom nav ────────────────────────────── */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-50 border-t border-border/40 bg-background/95 backdrop-blur-xl"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="grid grid-cols-5 px-2 py-1.5">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex flex-col items-center justify-center gap-1 rounded-lg py-2.5 text-[10px] font-semibold transition-all relative min-h-[44px]',
                  isActive ? 'text-primary' : 'text-muted-foreground/70 hover:text-muted-foreground'
                )}
              >
                {isActive && (
                  <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-4 h-[2px] rounded-full bg-primary"
                    style={{ boxShadow: '0 0 6px rgba(240,112,64,0.6)' }} />
                )}
                <item.icon className={cn('w-5 h-5', isActive ? 'text-primary' : 'text-muted-foreground/60')} />
                <span className="text-[9px]">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
