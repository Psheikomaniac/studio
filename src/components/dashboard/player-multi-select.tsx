"use client";

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
  const toggle = (id: string) => {
    const selected = value.includes(id) ? value.filter((x) => x !== id) : [...value, id];
    onChange(selected);
  };

  return (
    <Popover>
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
        <Command>
          <CommandInput placeholder="Search players..." />
          <CommandList>
            <CommandEmpty>No players found.</CommandEmpty>
            <CommandGroup>
              {players.map((player) => (
                <CommandItem
                  key={player.id}
                  value={`${player.name} ${player.nickname}`}
                  onSelect={() => toggle(player.id)}
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
