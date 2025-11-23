
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
import { formatEuro } from "@/lib/csv-utils";
import { useTranslation } from 'react-i18next';

type RecordDuePaymentDialogProps = {
  isOpen: boolean;
  setOpen: (open: boolean) => void;
  players: Player[];
  dues: Due[];
  onRecord: (data: { playerIds: string[], dueId: string, status: "paid" | "exempt" }) => void;
};

export function RecordDuePaymentDialog({ isOpen, setOpen, players, dues, onRecord }: RecordDuePaymentDialogProps) {
  const { t } = useTranslation();

  const duePaymentSchema = z.object({
    playerIds: z.array(z.string()).min(1, t('dialogs.validation.selectPlayer')),
    dueId: z.string().min(1, t('dialogs.validation.selectDue')),
    status: z.enum(["paid", "exempt"]),
  });

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
          <DialogTitle className="font-headline">{t('dialogs.recordDueTitle')}</DialogTitle>
          <DialogDescription>
            {t('dialogs.recordDueDesc')}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
            <FormField
              control={form.control}
              name="playerIds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('dialogs.players')}</FormLabel>
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
                  <FormLabel>{t('dialogs.due')}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('dialogs.selectDue')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {dues.filter(due => !due.archived).map((due) => (
                        <SelectItem key={due.id} value={due.id}>
                          {due.name} ({formatEuro(due.amount)})
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
                  <FormLabel>{t('dialogs.status')}</FormLabel>
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
                          {t('dialogs.markPaid')}
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="exempt" />
                        </FormControl>
                        <FormLabel className="font-normal">
                          {t('dialogs.markExempt')}
                        </FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="submit">{t('dialogs.recordPayment')}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
