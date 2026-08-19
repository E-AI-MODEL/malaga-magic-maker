import { Link } from "react-router-dom";
import { ArrowLeft, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Surface } from "@/components/primitives";

export default function Steun() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/95">
        <div className="mx-auto flex h-14 max-w-2xl items-center gap-2 px-5">
          <Button asChild variant="ghost" size="sm" className="rounded-full">
            <Link to="/">
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Terug
            </Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-5 pb-16">
        <h1 className="mt-8 font-brand text-[30px] font-semibold leading-tight">Vakansie steunen</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Vakansie is en blijft gratis. Met een eenmalige bijdrage van € 2 help je de kosten van hosting, veilige
          opslag van je documenten en Hansie dragen. Je krijgt er geen extra functies voor — het is puur een
          steuntje in de rug.
        </p>

        <Surface className="mt-6 p-5">
          <p className="flex items-baseline gap-1.5 font-brand text-[34px] font-semibold leading-none">
            € 2
            <span className="font-sans text-[13px] font-normal text-muted-foreground">eenmalig</span>
          </p>
          <Button disabled className="mt-5 w-full rounded-full">
            <Heart className="mr-1.5 h-4 w-4" strokeWidth={1.75} />
            Binnenkort beschikbaar
          </Button>
          <p className="mt-2 text-xs text-muted-foreground">
            De betaalmodule wordt nu ingericht. Zodra die klaar is, kun je hier veilig afrekenen.
          </p>
        </Surface>
      </main>
    </div>
  );
}
