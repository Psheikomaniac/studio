"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Player } from "@/lib/types";

export type PlayerMultiSelectProps = {
  players: Player[];
  value: string[];
  onChange: (ids: string[]) => void;
  placeholder?: string;
  className?: string;
};

export function PlayerMultiSelect({ players, value, onChange, placeholder = "Select players", className }: PlayerMultiSelectProps) {
  const [open, setOpen] = React.useState(false);

  const toggle = (id: string) => {
    const selected = value.includes(id) ? value.filter((x) => x !== id) : [...value, id];
    onChange(selected);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          className={cn("w-full justify-between", !value?.length && "text-muted-foreground", className)}
        >
          <div className="flex gap-1 items-center">
            <UserPlus className="h-4 w-4" />
            {value?.length > 0 ? `${value.length} player(s) selected` : placeholder}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Search players..." />
          <CommandList>
            <CommandEmpty>No players found.</CommandEmpty>
            <CommandGroup>
              {players.map((player) => (
                <CommandItem
                  key={player.id}
                  value={player.id}
                  keywords={[player.name, player.nickname]}
                  onSelect={() => {
                    // Prevent default behavior
                  }}
                  onClick={(e) => {
                    e.preventDefault();
                    toggle(player.id);
                  }}
                  className="cursor-pointer"
                >
                  <Check className={cn("mr-2 h-4 w-4", value.includes(player.id) ? "opacity-100" : "opacity-0")} />
                  {player.name} ({player.nickname})
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
