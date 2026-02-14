
"use client";

import { useState, useEffect } from "react";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Player } from "@/lib/types";
import { PlayerMultiSelect } from "./player-multi-select";
import { getFineSuggestion } from "@/lib/actions";
import { formatEuro } from "@/lib/csv-utils";
import { useTranslation } from 'react-i18next';
import { useTeamPredefinedFines } from '@/services/predefined-fines.service';
import { useTeam } from '@/team';


type AddFineDialogProps = {
  isOpen: boolean;
  setOpen: (open: boolean) => void;
  players: Player[];
  onFineAdded: (fine: any) => void;
};

export function AddFineDialog({ isOpen, setOpen, players, onFineAdded }: AddFineDialogProps) {
  const { teamId } = useTeam();
  const { data: predefinedFines, isLoading: predefinedFinesLoading } = useTeamPredefinedFines(teamId);
  const { t } = useTranslation();
  const [isAiLoading, setIsAiLoading] = useState(false);
  const { toast } = useToast();

  const fineSchema = z.object({
    playerIds: z.array(z.string()).min(1, t('dialogs.validation.selectPlayer')),
    reason: z.string().min(3, t('dialogs.validation.reasonLength')),
    amount: z.coerce.number().positive(t('dialogs.validation.positiveAmount')),
    aiDescription: z.string().optional(),
  });

  const form = useForm<z.infer<typeof fineSchema>>({
    resolver: zodResolver(fineSchema),
    defaultValues: {
      playerIds: [],
      reason: "",
      amount: 0,
      aiDescription: "",
    },
  });

  useEffect(() => {
    if (isOpen) {
      form.reset({
        playerIds: [],
        reason: "",
        amount: 0,
        aiDescription: "",
      });
    }
  }, [isOpen, form]);

  const onSubmit = (values: z.infer<typeof fineSchema>) => {
    onFineAdded({
      playerIds: values.playerIds,
      reason: values.reason,
      amount: values.amount,
    });
    setOpen(false);
  };

  const handleAiSuggest = async () => {
    const description = form.getValues("aiDescription");
    if (!description) {
      toast({
        variant: "destructive",
        title: t('error'),
        description: t('dialogs.pleaseEnterDesc'),
      });
      return;
    }

    setIsAiLoading(true);
    const result = await getFineSuggestion(description);
    setIsAiLoading(false);

    if (result.error) {
      toast({ variant: "destructive", title: t('dialogs.aiError'), description: result.error });
    } else if (result.suggestedReason && result.suggestedPlayers) {
      form.setValue("reason", result.suggestedReason, { shouldValidate: true });

      const matchedIds = (result.suggestedPlayers as (Player | undefined)[])
        .map((sp) => players.find(p => p.id === sp?.id)?.id)
        .filter((id: string | undefined): id is string => !!id);
      if (matchedIds.length > 0) {
        form.setValue("playerIds", matchedIds, { shouldValidate: true });
      }

      toast({
        title: t('dialogs.aiSuggestionApplied'),
        description: t('dialogs.aiSuggestionAppliedDesc'),
      });
    }
  };

  const handlePredefinedFineChange = (value: string) => {
    const fine = (predefinedFines || []).find(f => f.reason === value);
    if (fine) {
      form.setValue("reason", fine.reason, { shouldValidate: true });
      form.setValue("amount", fine.amount, { shouldValidate: true });
    } else {
      form.setValue("reason", value, { shouldValidate: true });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="font-headline">{t('dialogs.addFineTitle')}</DialogTitle>
          <DialogDescription>
            {t('dialogs.addFineDesc')}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
            <FormField
              control={form.control}
              name="aiDescription"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('dialogs.transgressionDesc')}</FormLabel>
                  <FormControl>
                    <Textarea placeholder="e.g., 'Alex and Ben were late for training again...'" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="button" onClick={handleAiSuggest} disabled={isAiLoading} variant="outline" className="w-full">
              {isAiLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4 text-accent" />}
              {t('dialogs.suggestWithAI')}
            </Button>

            <div className="my-2 flex items-center gap-2">
              <div className="flex-grow border-t border-border"></div>
              <span className="text-xs text-muted-foreground">OR</span>
              <div className="flex-grow border-t border-border"></div>
            </div>

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
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('dialogs.reason')}</FormLabel>
                  <Select onValueChange={handlePredefinedFineChange} value={field.value} disabled={predefinedFinesLoading}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={predefinedFinesLoading ? "Loading fines..." : "Select or type a reason..."} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {(predefinedFines || []).map((fine) => (
                        <SelectItem key={fine.id} value={fine.reason}>
                          {fine.reason} ({formatEuro(fine.amount)})
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
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('dialogs.amount')}</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" placeholder="5.00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit">{t('dialogs.assignFine')}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
