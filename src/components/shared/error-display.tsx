import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

interface ErrorDisplayProps {
  error: Error;
  retry?: () => void;
  title?: string;
}

export function ErrorDisplay({ error, retry, title = 'Error Loading Data' }: ErrorDisplayProps) {
  return (
    <div className="container mx-auto p-4">
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>{title}</AlertTitle>
        <AlertDescription className="mt-2">
          <div className="space-y-2">
            <p>{error.message}</p>
            {retry && (
              <Button
                onClick={retry}
                variant="outline"
                size="sm"
                className="mt-2"
              >
                Retry
              </Button>
            )}
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
}
