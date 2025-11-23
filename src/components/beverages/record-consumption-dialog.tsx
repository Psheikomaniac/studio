
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
import { formatEuro } from "@/lib/csv-utils";
import { useTranslation } from 'react-i18next';

type RecordConsumptionDialogProps = {
  isOpen: boolean;
  setOpen: (open: boolean) => void;
  players: Player[];
  beverages: Beverage[];
  onRecord: (data: { playerIds: string[], beverageId: string }) => void;
};

export function RecordConsumptionDialog({ isOpen, setOpen, players, beverages, onRecord }: RecordConsumptionDialogProps) {
  const { t } = useTranslation();

  const consumptionSchema = z.object({
    playerIds: z.array(z.string()).min(1, t('dialogs.validation.selectPlayer')),
    beverageId: z.string().min(1, t('dialogs.validation.selectBeverage')),
  });

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
          <DialogTitle className="font-headline">{t('dialogs.recordConsumptionTitle')}</DialogTitle>
          <DialogDescription>
            {t('dialogs.recordConsumptionDesc')}
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
              name="beverageId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('dialogs.beverage')}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder={t('dialogs.selectBeverage')} />
                        </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {beverages.map((bev) => (
                        <SelectItem key={bev.id} value={bev.id}>
                          {bev.name} ({formatEuro(bev.price)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="submit">{t('dialogs.recordConsumption')}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
