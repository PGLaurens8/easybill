
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Home, Briefcase, ClipboardList, FileText, FileSpreadsheet, Lightbulb, Settings, LogOut, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

const navItems = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Projects', href: '/projects', icon: Briefcase },
  { name: 'BOQ Generator', href: '/boq', icon: ClipboardList },
  { name: 'Claims System', href: '/claims', icon: FileText },
  { name: 'Payment Certificates', href: '/payment-certificates', icon: FileSpreadsheet },
  { name: 'AI Rate Suggestion', href: '/rate-suggestion', icon: Lightbulb },
];

const bottomNavItems = [
  { name: 'Settings', href: '/settings', icon: Settings },
];

export default function AppSidebar() {
  const pathname = usePathname();
  const { signOut } = useAuth();
  const router = useRouter();
  const { state, open, setOpen, toggleSidebar } = useSidebar();

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  return (
    <Sidebar side="left" collapsible="icon" className="hidden md:flex border-r border-sidebar-border">
      <SidebarHeader className="p-4 border-b border-sidebar-border justify-between items-center">
         <Link href="/dashboard" className={cn(
            "flex items-center gap-2 text-lg font-semibold text-sidebar-foreground",
            state === "collapsed" && "hidden"
          )}>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-primary"><path d="M12 2L2 7l10 5 10-5-10-5z"></path><path d="M2 17l10 5 10-5"></path><path d="M2 12l10 5 10-5"></path></svg>
            <span className="font-headline">QuantEasy</span>
        </Link>
        <Button variant="ghost" size="icon" onClick={toggleSidebar} className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
          {open ? <PanelLeftClose /> : <PanelLeftOpen />}
        </Button>
      </SidebarHeader>
      <SidebarContent className="flex-1 p-2">
        <SidebarMenu>
          {navItems.map((item) => (
            <SidebarMenuItem key={item.name}>
              <Link href={item.href}>
                <SidebarMenuButton
                  variant="default"
                  size="default"
                  isActive={pathname.startsWith(item.href)}
                  tooltip={{ children: item.name, side: 'right', className: 'bg-popover text-popover-foreground' }}
                  className="justify-start"
                >
                  <item.icon className="h-5 w-5" />
                  <span className={cn(state === "collapsed" && "hidden")}>{item.name}</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="p-2 border-t border-sidebar-border">
        <SidebarMenu>
          {bottomNavItems.map((item) => (
             <SidebarMenuItem key={item.name}>
                <Link href={item.href}>
                  <SidebarMenuButton
                    variant="default"
                    size="default"
                    isActive={pathname.startsWith(item.href)}
                    tooltip={{ children: item.name, side: 'right', className: 'bg-popover text-popover-foreground' }}
                    className="justify-start"
                  >
                    <item.icon className="h-5 w-5" />
                    <span className={cn(state === "collapsed" && "hidden")}>{item.name}</span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
          ))}
          <SidebarMenuItem>
            <SidebarMenuButton
              variant="default"
              size="default"
              onClick={handleSignOut}
              tooltip={{ children: "Log Out", side: 'right', className: 'bg-popover text-popover-foreground' }}
              className="justify-start text-destructive hover:bg-destructive/10 hover:text-destructive focus:bg-destructive/10 focus:text-destructive"
            >
              <LogOut className="h-5 w-5" />
              <span className={cn(state === "collapsed" && "hidden")}>Log Out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
