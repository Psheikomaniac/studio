
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Trash2, RotateCcw } from "lucide-react";
import { importCSVToFirestore } from "@/lib/csv-import-firestore";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { collection, getDocs, writeBatch } from "firebase/firestore";
import { useFirebaseOptional } from "@/firebase/use-firebase-optional";
import { Progress } from "@/components/ui/progress";

export default function SettingsPage() {
  const { toast } = useToast();
  const firebase = useFirebaseOptional();
  const [isFirebaseAvailable, setIsFirebaseAvailable] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Wait for client-side mount to check Firebase availability
  useEffect(() => {
    setIsMounted(true);
    setIsFirebaseAvailable(firebase?.firestore != null);
  }, [firebase]);

  const firestore = firebase?.firestore ?? null;

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<string>("");
  const [importProgress, setImportProgress] = useState(0);
  const [importTotal, setImportTotal] = useState(0);

  // Dialog states
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Loading states
  const [isResetting, setIsResetting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file?.type === 'text/csv' || file?.name.endsWith('.csv')) {
      setSelectedFile(file);
      setUploadResult(""); // Clear previous results
    } else if (file) {
      toast({
        title: "Invalid file type",
        description: "Please select a CSV file",
        variant: "destructive"
      });
      e.target.value = ""; // Reset input
    }
  };

  const handleImport = async () => {
    if (!firestore) {
      toast({
        title: "Firebase not available",
        description: "Firebase must be enabled to import data. Set NEXT_PUBLIC_USE_FIREBASE=true in .env.local",
        variant: "destructive"
      });
      return;
    }

    if (!selectedFile) {
      toast({
        title: "No file selected",
        description: "Please select a file first",
        variant: "destructive"
      });
      return;
    }

    setUploading(true);
    setUploadResult("");
    setImportProgress(0);
    setImportTotal(0);

    try {
      // Detect CSV type by filename
      const filename = selectedFile.name.toLowerCase();
      let csvType: 'dues' | 'transactions' | 'punishments' | 'unknown';

      if (filename.includes('dues')) {
        csvType = 'dues';
      } else if (filename.includes('transaction')) {
        csvType = 'transactions';
      } else if (filename.includes('punishment')) {
        csvType = 'punishments';
      } else {
        csvType = 'unknown';
      }

      // Read file content
      const text = await selectedFile.text();

      // Call appropriate import handler
      if (csvType === 'unknown') {
        throw new Error('Unknown CSV type. Filename must contain "dues", "transaction", or "punishment"');
      }

      // Import to Firestore with progress callback
      const result = await importCSVToFirestore(
        firestore,
        text,
        csvType,
        (progress, total) => {
          setImportProgress(progress);
          setImportTotal(total);
        }
      );

      const successMessage = `Successfully imported ${csvType} data to Firestore: ${result.rowsProcessed} rows, ${result.playersCreated} players created, ${result.recordsCreated} records created`;
      setUploadResult(successMessage);

      if (result.warnings.length > 0) {
        toast({
          title: `Import completed with ${result.warnings.length} warnings`,
          description: result.warnings.slice(0, 3).join(', '),
          variant: "default"
        });
      } else {
        toast({
          title: "Import successful",
          description: `${csvType} data imported to Firestore successfully`,
        });
      }

      if (result.errors.length > 0) {
        console.error('Import errors:', result.errors);
      }

      // Reset file input
      setSelectedFile(null);
      const fileInput = document.getElementById('import-file') as HTMLInputElement;
      if (fileInput) fileInput.value = "";

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setUploadResult(`Error: ${errorMessage}`);
      toast({
        title: "Import failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setUploading(false);
      setImportProgress(0);
      setImportTotal(0);
    }
  };

  /**
   * Reset all balances - marks all transactions as paid
   * This clears all debts but keeps players and transaction history
   */
  const handleResetBalances = async () => {
    if (!firestore) {
      toast({
        title: "Firebase not available",
        description: "Firebase must be enabled for this action.",
        variant: "destructive"
      });
      return;
    }

    setIsResetting(true);
    try {
      // Get all users
      const usersSnapshot = await getDocs(collection(firestore, 'users'));
      const batch = writeBatch(firestore);
      let transactionCount = 0;

      // For each user, mark all their transactions as paid
      for (const userDoc of usersSnapshot.docs) {
        const userId = userDoc.id;

        // Mark all fines as paid
        const finesSnapshot = await getDocs(collection(firestore, `users/${userId}/fines`));
        finesSnapshot.docs.forEach((fineDoc) => {
          batch.update(fineDoc.ref, {
            paid: true,
            paidAt: new Date().toISOString(),
            amountPaid: fineDoc.data().amount
          });
          transactionCount++;
        });

        // Mark all dues as paid
        const duesSnapshot = await getDocs(collection(firestore, `users/${userId}/duePayments`));
        duesSnapshot.docs.forEach((dueDoc) => {
          batch.update(dueDoc.ref, {
            paid: true,
            paidAt: new Date().toISOString(),
            amountPaid: dueDoc.data().amountDue
          });
          transactionCount++;
        });

        // Mark all beverages as paid
        const beveragesSnapshot = await getDocs(collection(firestore, `users/${userId}/beverageConsumptions`));
        beveragesSnapshot.docs.forEach((bevDoc) => {
          batch.update(bevDoc.ref, {
            paid: true,
            paidAt: new Date().toISOString(),
            amountPaid: bevDoc.data().amount
          });
          transactionCount++;
        });
      }

      await batch.commit();

      toast({
        title: "Erfolgreich zurückgesetzt",
        description: `Alle ${transactionCount} Transaktionen wurden als bezahlt markiert. Alle Guthaben sind jetzt 0€.`,
      });

      setShowResetDialog(false);
    } catch (error) {
      console.error('Error resetting balances:', error);
      toast({
        title: "Fehler beim Zurücksetzen",
        description: error instanceof Error ? error.message : "Ein unbekannter Fehler ist aufgetreten",
        variant: "destructive"
      });
    } finally {
      setIsResetting(false);
    }
  };

  /**
   * Delete all data - removes ALL players and ALL transactions
   * This is a complete reset and cannot be undone
   */
  const handleDeleteAllData = async () => {
    if (!firestore) {
      toast({
        title: "Firebase not available",
        description: "Firebase must be enabled for this action.",
        variant: "destructive"
      });
      return;
    }

    setIsDeleting(true);
    try {
      // Get all users
      const usersSnapshot = await getDocs(collection(firestore, 'users'));
      const batch = writeBatch(firestore);
      let deleteCount = 0;

      // For each user, delete all subcollections first, then the user
      for (const userDoc of usersSnapshot.docs) {
        const userId = userDoc.id;

        // Delete all fines
        const finesSnapshot = await getDocs(collection(firestore, `users/${userId}/fines`));
        finesSnapshot.docs.forEach((fineDoc) => {
          batch.delete(fineDoc.ref);
          deleteCount++;
        });

        // Delete all payments
        const paymentsSnapshot = await getDocs(collection(firestore, `users/${userId}/payments`));
        paymentsSnapshot.docs.forEach((paymentDoc) => {
          batch.delete(paymentDoc.ref);
          deleteCount++;
        });

        // Delete all dues
        const duesSnapshot = await getDocs(collection(firestore, `users/${userId}/duePayments`));
        duesSnapshot.docs.forEach((dueDoc) => {
          batch.delete(dueDoc.ref);
          deleteCount++;
        });

        // Delete all beverages
        const beveragesSnapshot = await getDocs(collection(firestore, `users/${userId}/beverageConsumptions`));
        beveragesSnapshot.docs.forEach((bevDoc) => {
          batch.delete(bevDoc.ref);
          deleteCount++;
        });

        // Delete the user document
        batch.delete(userDoc.ref);
        deleteCount++;
      }

      await batch.commit();

      toast({
        title: "Alle Daten gelöscht",
        description: `${deleteCount} Dokumente wurden erfolgreich gelöscht. Die Datenbank ist jetzt leer.`,
      });

      setShowDeleteDialog(false);
    } catch (error) {
      console.error('Error deleting all data:', error);
      toast({
        title: "Fehler beim Löschen",
        description: error instanceof Error ? error.message : "Ein unbekannter Fehler ist aufgetreten",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
      <div className="grid gap-4">
        <h1 className="font-headline text-3xl font-bold">Settings</h1>

        <Card>
          <CardHeader>
            <CardTitle>Team Management</CardTitle>
            <CardDescription>General team settings.</CardDescription>
          </CardHeader>
          <CardContent>
             <p className="text-sm text-muted-foreground">Team settings will be available here.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Data Import</CardTitle>
            <CardDescription>
              Upload existing data from a file. Please use a CSV file with the correct format.
              File name must contain "dues", "transaction", or "punishment" to detect the type.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid w-full max-w-sm items-center gap-1.5">
              <Label htmlFor="import-file">CSV File</Label>
              <Input
                id="import-file"
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                disabled={uploading}
              />
              {selectedFile && (
                <p className="text-sm text-muted-foreground">
                  Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
                </p>
              )}
            </div>
            <Button
              className="w-fit"
              onClick={handleImport}
              disabled={!selectedFile || uploading || !isMounted || !isFirebaseAvailable}
            >
              {uploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {uploading ? 'Importing...' : 'Import Data'}
            </Button>
            {uploading && importTotal > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Processing rows...</span>
                  <span>{importProgress} / {importTotal}</span>
                </div>
                <Progress value={(importProgress / importTotal) * 100} />
              </div>
            )}
            {uploadResult && (
              <p className={`text-sm ${uploadResult.startsWith('Error') ? 'text-destructive' : 'text-green-600'}`}>
                {uploadResult}
              </p>
            )}
          </CardContent>
        </Card>

         <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-destructive">Danger Zone</CardTitle>
            <CardDescription>These actions are irreversible.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-start gap-4">
            <div className="space-y-4 w-full">
              <div className="flex items-start gap-4">
                <Button
                  variant="destructive"
                  onClick={() => setShowResetDialog(true)}
                  disabled={isResetting || isDeleting || !isMounted || !isFirebaseAvailable}
                >
                  {isResetting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Resetting...
                    </>
                  ) : (
                    <>
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Reset All Balances
                    </>
                  )}
                </Button>
                <div className="flex-1">
                  <p className="text-sm font-medium">Reset All Balances</p>
                  <p className="text-sm text-muted-foreground">
                    Marks all transactions as paid. Players remain but all debts are cleared to 0€.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <Button
                  variant="outline"
                  className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                  onClick={() => setShowDeleteDialog(true)}
                  disabled={isResetting || isDeleting || !isMounted || !isFirebaseAvailable}
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete All Data
                    </>
                  )}
                </Button>
                <div className="flex-1">
                  <p className="text-sm font-medium">Delete All Data</p>
                  <p className="text-sm text-muted-foreground">
                    Permanently deletes ALL players and ALL transactions. Cannot be undone!
                  </p>
                </div>
              </div>

              {isMounted && !isFirebaseAvailable && (
                <div className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
                  ⚠️ Firebase ist derzeit nicht verfügbar. Diese Funktionen benötigen eine aktive Datenbankverbindung.
                  Bitte setze NEXT_PUBLIC_USE_FIREBASE=true in .env.local und starte den Server neu.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reset All Balances Confirmation Dialog */}
      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Alle Guthaben zurücksetzen?</AlertDialogTitle>
            <AlertDialogDescription>
              Diese Aktion wird alle offenen Transaktionen (Strafen, Beiträge, Getränke) als bezahlt markieren.
              Alle Spieler-Guthaben werden auf 0€ gesetzt.
              <br /><br />
              <strong>Die Spieler und die Transaction-History bleiben erhalten.</strong>
              <br /><br />
              Diese Aktion kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isResetting}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleResetBalances}
              disabled={isResetting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isResetting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Wird zurückgesetzt...
                </>
              ) : (
                "Ja, alle Guthaben zurücksetzen"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete All Data Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">⚠️ Alle Daten löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong className="text-destructive">ACHTUNG: Diese Aktion löscht PERMANENT:</strong>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Alle Spieler</li>
                <li>Alle Strafen</li>
                <li>Alle Zahlungen</li>
                <li>Alle Beiträge</li>
                <li>Alle Getränke-Konsumierungen</li>
              </ul>
              <br />
              <strong className="text-destructive">Die Datenbank wird komplett geleert!</strong>
              <br /><br />
              Diese Aktion kann <strong>NICHT</strong> rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAllData}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Wird gelöscht...
                </>
              ) : (
                "Ja, ALLES löschen"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
