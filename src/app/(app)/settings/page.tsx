
'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { importCSV } from "@/lib/csv-import";

export default function SettingsPage() {
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<string>("");

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

      const result = await importCSV(text, csvType);

      const successMessage = `Successfully imported ${csvType} data: ${result.rowsProcessed} rows, ${result.playersCreated} players created, ${result.errors.length} errors`;
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
          description: `${csvType} data imported successfully`,
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
              disabled={!selectedFile || uploading}
            >
              {uploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {uploading ? 'Importing...' : 'Import Data'}
            </Button>
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
             <Button variant="destructive">Reset All Balances</Button>
             <Button variant="outline">Delete All Data</Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
