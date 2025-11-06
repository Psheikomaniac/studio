"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown, UserPlus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Player } from "@/lib/types";
import { Input } from "@/components/ui/input";

export type PlayerMultiSelectProps = {
  players: Player[];
  value: string[];
    onChange: (ids: string[]) => void;
  placeholder?: string;
  className?: string;
};

export function PlayerMultiSelect({ players, value, onChange, placeholder = "Select players", className }: PlayerMultiSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  const toggle = (id: string) => {
    console.log("Toggle clicked for player:", id);
    const selected = value.includes(id) ? value.filter((x) => x !== id) : [...value, id];
    onChange(selected);
    console.log("New selection:", selected);
  };

  const filteredPlayers = players
    .filter((player) => player.active !== false) // hide inactive players
    .filter((player) => {
      const searchLower = search.toLowerCase();
      return (
        player.name.toLowerCase().includes(searchLower) ||
        player.nickname.toLowerCase().includes(searchLower)
      );
    });

  console.log("PlayerMultiSelect render:", { open, playersCount: players.length, selectedCount: value.length });

  return (
    <div className="relative">
      <Button
        type="button"
        variant="outline"
        onClick={() => setOpen(!open)}
        className={cn("w-full justify-between", !value?.length && "text-muted-foreground", className)}
      >
        <div className="flex gap-1 items-center">
          <UserPlus className="h-4 w-4" />
          {value?.length > 0 ? `${value.length} player(s) selected` : placeholder}
        </div>
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover p-2 shadow-md">
          <div className="mb-2">
            <div className="relative">
              <Input
                placeholder="Search players..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pr-8"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          <div className="max-h-64 overflow-y-auto">
            {filteredPlayers.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                No players found.
              </div>
            ) : (
              filteredPlayers.map((player) => (
                <div
                  key={player.id}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggle(player.id);
                  }}
                  className={cn(
                    "flex items-center gap-2 px-2 py-2 cursor-pointer rounded-sm hover:bg-accent hover:text-accent-foreground",
                    value.includes(player.id) && "bg-accent/50"
                  )}
                >
                  <div className={cn("flex h-4 w-4 items-center justify-center rounded-sm border border-primary", value.includes(player.id) ? "bg-primary text-primary-foreground" : "opacity-50")}>
                    {value.includes(player.id) && <Check className="h-3 w-3" />}
                  </div>
                  <span className="text-sm">
                    {player.name} ({player.nickname})
                  </span>
                </div>
              ))
            )}
          </div>

          <div className="mt-2 flex justify-end">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => setOpen(false)}
            >
              Done
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
