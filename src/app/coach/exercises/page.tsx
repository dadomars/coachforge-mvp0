import { Suspense } from "react";
import ExercisesClient from "./ExercisesClient";

export default function Page() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Caricamento…</div>}>
      <ExercisesClient />
    </Suspense>
  );
}