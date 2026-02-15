
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icons } from "@/components/icons";
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";

import { useTranslation } from 'react-i18next';

export function MainNav() {
  const { t } = useTranslation();
  const pathname = usePathname();

  const navItems = [
    { href: "/dashboard", label: t('nav.dashboard'), icon: Icons.Dashboard },
    { href: "/players", label: t('nav.players'), icon: Icons.Players },
    { href: "/money", label: t('nav.money'), icon: Icons.Money },
    { href: "/settings", label: t('nav.settings'), icon: Icons.Settings },
  ];

  return (
    <SidebarMenu>
      {navItems.map((item) => (
        <SidebarMenuItem key={item.href}>
          <SidebarMenuButton
            asChild
            isActive={pathname.startsWith(item.href)}
            className="justify-start"
            tooltip={item.label}
          >
            <Link href={item.href}>
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}
