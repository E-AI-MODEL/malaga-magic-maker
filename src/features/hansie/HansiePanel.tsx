import { ArrowUpRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { askHansie, hansiePageQuestions, type HansiePage } from "./bus";

export function HansieMark({ className = "h-8 w-8 text-[15px]" }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-primary font-display font-bold uppercase leading-none text-primary-foreground ${className}`}
    >
      H
    </span>
  );
}

/**
 * Hansie inside the screen: a short line plus questions you can ask with one tap.
 * With `tripId` set, the questions open that trip first and are asked there.
 */
export function HansiePanel({
  page,
  title,
  tripId,
  className = "",
}: {
  page: HansiePage;
  title: string;
  tripId?: string;
  className?: string;
}) {
  const navigate = useNavigate();
  const questions = hansiePageQuestions(page);

  const ask = (question: string) => {
    if (tripId) navigate(`/trip/${tripId}?vraag=${encodeURIComponent(question)}`);
    else askHansie(question);
  };

  return (
    <section className={`border-l-4 border-primary bg-band p-4 ${className}`} aria-label="Hansie">
      <div className="flex items-center gap-3">
        <HansieMark />
        <div className="min-w-0">
          <p className="font-ui text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">Hansie</p>
          <p className="font-ui text-[15px] font-semibold leading-snug">{title}</p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {questions.map((question) => (
          <button
            key={question}
            type="button"
            onClick={() => ask(question)}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-md border border-foreground/20 bg-card px-3 text-left font-ui text-[13px] font-medium transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {question}
            <ArrowUpRight className="h-3.5 w-3.5 text-primary" strokeWidth={2} aria-hidden />
          </button>
        ))}
      </div>
    </section>
  );
}
