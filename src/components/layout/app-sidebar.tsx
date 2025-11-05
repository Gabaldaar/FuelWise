'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Car, Fuel, LayoutDashboard, Leaf, Settings, Wrench } from 'lucide-react';

import {
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';

const menuItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/logs', label: 'Registros', icon: Fuel },
  { href: '/dashboard/services', label: 'Servicios', icon: Wrench },
  { href: '/dashboard/vehicles', label: 'Vehículos', icon: Car },
  { href: '/dashboard/settings', label: 'Configuración', icon: Settings },
];

export default function AppSidebar() {
  const pathname = usePathname();

  return (
    <>
      <SidebarHeader>
        <div className="flex items-center gap-2">
            <Leaf className="size-6 text-primary" />
            <h1 className="font-headline text-xl font-semibold">FuelWise</h1>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <Link href={item.href}>
                <SidebarMenuButton
                  isActive={pathname.startsWith(item.href) && (item.href === '/dashboard' ? pathname === item.href : true)}
                  tooltip={{ children: item.label }}
                >
                  <item.icon />
                  <span>{item.label}</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
    </>
  );
}
