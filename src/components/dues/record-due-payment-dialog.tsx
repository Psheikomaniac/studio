
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { Player, Due } from "@/lib/types";
import { useEffect } from "react";
import { PlayerMultiSelect } from "@/components/dashboard/player-multi-select";

const duePaymentSchema = z.object({
  playerIds: z.array(z.string()).min(1, "Please select at least one player."),
  dueId: z.string().min(1, "Please select a due."),
  status: z.enum(["paid", "exempt"]),
});

type RecordDuePaymentDialogProps = {
  isOpen: boolean;
  setOpen: (open: boolean) => void;
  players: Player[];
  dues: Due[];
  onRecord: (data: { playerIds: string[], dueId: string, status: "paid" | "exempt" }) => void;
};

export function RecordDuePaymentDialog({ isOpen, setOpen, players, dues, onRecord }: RecordDuePaymentDialogProps) {
  const form = useForm<z.infer<typeof duePaymentSchema>>({
    resolver: zodResolver(duePaymentSchema),
    defaultValues: {
      playerIds: [],
      dueId: "",
      status: "paid",
    },
  });

  useEffect(() => {
    if (isOpen) {
      form.reset({
        playerIds: [],
        dueId: "",
        status: "paid",
      });
    }
  }, [isOpen, form]);

  const onSubmit = (values: z.infer<typeof duePaymentSchema>) => {
    onRecord({ playerIds: values.playerIds, dueId: values.dueId, status: values.status });
    setOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="font-headline">Record Due Payment</DialogTitle>
          <DialogDescription>
            Select players and mark their due as paid or exempt.
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
              name="dueId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Due</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a due" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {dues.filter(due => !due.archived).map((due) => (
                        <SelectItem key={due.id} value={due.id}>
                          {due.name} (€{due.amount.toFixed(2)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Status</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex flex-col space-y-1"
                    >
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="paid" />
                        </FormControl>
                        <FormLabel className="font-normal">
                          Mark as Paid
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="exempt" />
                        </FormControl>
                        <FormLabel className="font-normal">
                          Mark as Exempt
                        </FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="submit">Record Payment</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
