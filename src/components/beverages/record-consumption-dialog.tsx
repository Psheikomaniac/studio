
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
import type { Player, Beverage } from "@/lib/types";
import { useEffect } from "react";
import { PlayerMultiSelect } from "@/components/dashboard/player-multi-select";

const consumptionSchema = z.object({
  playerIds: z.array(z.string()).min(1, "Please select at least one player."),
  beverageId: z.string().min(1, "Please select a beverage."),
});

type RecordConsumptionDialogProps = {
  isOpen: boolean;
  setOpen: (open: boolean) => void;
  players: Player[];
  beverages: Beverage[];
  onRecord: (data: { playerIds: string[], beverageId: string }) => void;
};

export function RecordConsumptionDialog({ isOpen, setOpen, players, beverages, onRecord }: RecordConsumptionDialogProps) {
  const form = useForm<z.infer<typeof consumptionSchema>>({
    resolver: zodResolver(consumptionSchema),
    defaultValues: {
      playerIds: [],
      beverageId: "",
    },
  });

  useEffect(() => {
    if (isOpen) {
        form.reset({
            playerIds: [],
            beverageId: "",
        })
    }
  }, [isOpen, form]);

  const onSubmit = (values: z.infer<typeof consumptionSchema>) => {
    onRecord({ playerIds: values.playerIds, beverageId: values.beverageId });
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
                <FormItem>
                  <FormLabel>Players</FormLabel>
                  <PlayerMultiSelect
                    players={players}
                    value={field.value ?? []}
                    onChange={field.onChange}
                  />
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
