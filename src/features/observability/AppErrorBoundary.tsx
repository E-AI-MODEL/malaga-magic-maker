import { Component, ReactNode } from "react";
import { reportClientError } from "@/features/observability/clientErrors";

type Props = { children: ReactNode };
type State = { hasError: boolean };

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    void reportClientError({ area: "react_render", error });
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="min-h-screen bg-background px-5 py-16">
        <div className="mx-auto flex w-full max-w-md flex-col">
          <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Er ging iets mis
          </span>
          <h1 className="mt-3 font-serif text-3xl leading-tight text-foreground">
            We konden dit scherm niet laden
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            De fout is gemeld. Probeer het opnieuw; je gegevens blijven bewaard.
          </p>

          <div className="mt-8 border-t border-border/70">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="w-full border-b border-border/70 py-4 text-left text-sm text-foreground"
            >
              Opnieuw laden
            </button>
            <a
              href="/trips"
              className="block border-b border-border/70 py-4 text-sm text-foreground"
            >
              Naar Mijn reizen
            </a>
          </div>
        </div>
      </main>
    );
  }
}
