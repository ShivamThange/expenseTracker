'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useSession } from 'next-auth/react';
import { cn } from '@/lib/utils';
import { Home, Users, CreditCard, Clock, Scale, Settings, LogOut } from 'lucide-react';

const navItems = [
  { href: '/dashboard', label: 'Overview', icon: Home },
  { href: '/dashboard/groups', label: 'Groups', icon: Users },
  { href: '/dashboard/expenses', label: 'Expenses', icon: CreditCard },
  { href: '/dashboard/history', label: 'History', icon: Clock },
  { href: '/dashboard/balances', label: 'Balances', icon: Scale },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const user = session?.user;
  const initials = user?.name?.split(' ').map((n) => n[0]).join('').toUpperCase() ?? '?';

  return (
    <>
      <aside className="hidden lg:flex lg:flex-col w-64 min-h-screen border-r border-border/40 bg-[#0a0a0a] shrink-0">
        {/* Logo */}
        <div className="h-20 flex items-center px-6 border-b border-border/40">
          <Link href="/dashboard" className="flex items-center gap-3 group">
            <div className="w-8 h-8 rounded shrink-0 bg-primary flex items-center justify-center group-hover:neon-glow transition-all">
              <span className="text-primary-foreground font-black text-sm tracking-tighter">NP</span>
            </div>
            <span className="font-bold text-lg uppercase tracking-widest text-foreground">Neon Pulse</span>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-3 rounded-sm text-sm font-bold uppercase tracking-wider transition-all relative overflow-hidden group',
                  isActive
                    ? 'bg-white/5 text-primary'
                    : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'
                )}
              >
                {isActive && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary neon-glow" />
                )}
                <item.icon className={cn("w-5 h-5", isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div className="p-4 border-t border-border/40">
          <DropdownMenu>
            <DropdownMenuTrigger render={
              <button className="flex items-center gap-3 w-full px-3 py-3 rounded-sm hover:bg-white/5 transition-colors text-left border border-transparent hover:border-border/50">
                <Avatar className="h-9 w-9 rounded-sm ring-1 ring-primary/50">
                  <AvatarImage src={user?.image ?? ''} />
                  <AvatarFallback className="text-xs bg-primary text-primary-foreground font-bold rounded-sm inline-flex items-center justify-center">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold uppercase tracking-wider text-foreground truncate">{user?.name}</p>
                  <p className="text-[10px] font-mono text-muted-foreground truncate">{user?.email}</p>
                </div>
              </button>
            } />
            <DropdownMenuContent align="end" className="w-56 bg-[#111] border-border/40 rounded-sm">
              <DropdownMenuItem onClick={() => window.location.href = '/dashboard/settings'} className="text-xs uppercase tracking-wider font-bold focus:bg-white/5 cursor-pointer py-2">
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-border/40" />
              <DropdownMenuItem onClick={() => signOut({ callbackUrl: '/' })} className="text-xs uppercase tracking-wider font-bold text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer py-2">
                <LogOut className="w-4 h-4 mr-2" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-50 border-t border-border/40 bg-[#0a0a0a]/95 backdrop-blur">
        <div className="grid grid-cols-5 px-2 py-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex flex-col items-center justify-center gap-1 rounded-sm py-2 text-[10px] font-bold uppercase tracking-wider transition-colors',
                  isActive ? 'text-primary bg-white/5' : 'text-muted-foreground'
                )}
              >
                <item.icon className={cn('w-4 h-4', isActive ? 'text-primary' : 'text-muted-foreground')} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
