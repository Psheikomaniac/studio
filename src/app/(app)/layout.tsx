
'use client';

import { MainNav } from "@/components/main-nav";
import { UserNav } from "@/components/user-nav";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarInset,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Icons } from "@/components/icons";
import { ThemeToggle } from "@/components/theme-toggle";
import { LogoutButton } from "@/components/logout-button";
import { AuthGuard } from "@/components/auth-guard";
import { InactivityHandler } from "@/components/inactivity-handler";
import { LanguageSelector } from "@/components/language-selector";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <InactivityHandler />
      <SidebarProvider>
        <Sidebar>
          <SidebarHeader className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icons.Logo className="w-8 h-8 text-primary" />
                <h1 className="text-xl font-headline font-semibold text-primary">
                  balanceUp
                </h1>
              </div>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <MainNav />
          </SidebarContent>
          <SidebarFooter className="p-4">
            <div className="flex flex-col gap-2">
              <UserNav />
              <ThemeToggle />
              <LogoutButton />
            </div>
          </SidebarFooter>
        </Sidebar>
        <SidebarInset>
          <header className="flex h-14 items-center gap-4 border-b bg-background px-6 lg:h-[60px]">
            <div className="flex-1" />
            <LanguageSelector />
          </header>
          {children}
        </SidebarInset>
      </SidebarProvider>
    </AuthGuard>
  );
}
