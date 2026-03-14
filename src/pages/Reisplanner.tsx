import { AppLayout } from "@/components/AppLayout";

export default function Reisplanner() {
  return (
    <AppLayout>
      <div className="flex flex-col items-center justify-center h-[calc(100vh-8rem)] md:h-[calc(100vh-3rem)] text-center px-6">
        <p className="text-muted-foreground text-sm">
          De AI Reisgids is nu beschikbaar als widget rechtsonder op elke pagina.
        </p>
        <p className="text-muted-foreground text-xs mt-1">
          Klik op het kompas-icoon om te starten.
        </p>
      </div>
    </AppLayout>
  );
}
