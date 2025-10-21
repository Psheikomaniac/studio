
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown, UserPlus } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import type { Player, Beverage } from "@/lib/types";

const consumptionSchema = z.object({
  playerIds: z.array(z.string()).min(1, "Please select at least one player."),
  beverageId: z.string().min(1, "Please select a beverage."),
});

type RecordConsumptionDialogProps = {
  isOpen: boolean;
  setOpen: (open: boolean) => void;
  players: Player[];
  beverages: Beverage[];
  onRecord: (data: z.infer<typeof consumptionSchema>) => void;
};

export function RecordConsumptionDialog({ isOpen, setOpen, players, beverages, onRecord }: RecordConsumptionDialogProps) {
  const form = useForm<z.infer<typeof consumptionSchema>>({
    resolver: zodResolver(consumptionSchema),
    defaultValues: {
      playerIds: [],
      beverageId: "",
    },
  });

  const onSubmit = (values: z.infer<typeof consumptionSchema>) => {
    onRecord(values);
    form.reset();
    setOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="font-headline">Record Beverage Consumption</DialogTitle>
          <DialogDescription>
            Select who had what. This will add the beverage price to the player's balance.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
            <FormField
              control={form.control}
              name="playerIds"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Player(s)</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          className={cn(
                            "w-full justify-between",
                            !field.value?.length && "text-muted-foreground"
                          )}
                        >
                          <div className="flex gap-1 items-center">
                            <UserPlus className="h-4 w-4" />
                            {field.value?.length > 0
                              ? `${field.value.length} player(s) selected`
                              : "Select players"}
                          </div>
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
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
                                onSelect={() => {
                                  const selected = field.value.includes(player.id)
                                    ? field.value.filter((id) => id !== player.id)
                                    : [...field.value, player.id];
                                  form.setValue("playerIds", selected, { shouldValidate: true });
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    field.value.includes(player.id) ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {player.name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="beverageId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Beverage</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="Select a beverage" />
                        </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {beverages.map((bev) => (
                        <SelectItem key={bev.id} value={bev.id}>
                          {bev.name} (€{bev.price.toFixed(2)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="submit">Record Consumption</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
