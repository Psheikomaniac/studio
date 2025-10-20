import DashboardClient from "@/components/dashboard/client-page";
import { players, fines, predefinedFines } from "@/lib/data";

export default function DashboardPage() {
  // In a real app, you would fetch this data from your database.
  const initialData = {
    players,
    fines,
    predefinedFines,
  };

  return <DashboardClient initialData={initialData} />;
}
