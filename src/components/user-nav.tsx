
'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CreditCard, LogOut, User as UserIcon } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export function UserNav() {
  const router = useRouter();

  // Mock user data since Firebase is removed
  const user = {
    displayName: 'Kassenwart',
    email: 'treasurer@team.com',
    photoURL: 'https://picsum.photos/seed/avatar1/100/100',
  };

  const handleSignOut = () => {
    // In a real app with auth, this would sign the user out.
    // For now, we can just log to console and simulate a redirect.
    console.log("User signed out.");
    // No login page to redirect to, so we can just stay here.
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="relative h-9 w-9 rounded-full"
          suppressHydrationWarning
        >
          <Avatar className="h-9 w-9">
            <AvatarImage
              src={user?.photoURL || ''}
              alt={user?.displayName || 'User'}
              data-ai-hint="person portrait"
            />
            <AvatarFallback>{user?.displayName?.charAt(0) || 'U'}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">
              {user?.displayName || ''}
            </p>
            <p className="text-xs leading-none text-muted-foreground">
              {user?.email || ''}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem>
            <UserIcon className="mr-2 h-4 w-4" />
            <span>Profile</span>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <CreditCard className="mr-2 h-4 w-4" />
            <span>Billing</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
