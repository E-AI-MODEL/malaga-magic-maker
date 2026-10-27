import { FormEvent, ReactNode } from "react";
import { ChevronDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type FormSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
};

/** Shared bottom-sheet shell for all Vakansie forms: consistent header, padding and width. */
export function FormSheet({ open, onOpenChange, title, description, children }: FormSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="form-sheet max-h-[92dvh] overflow-y-auto overscroll-contain rounded-t-lg border-t border-border bg-card px-5 pb-0 pt-6 sm:left-1/2 sm:max-w-xl sm:-translate-x-1/2"
      >
        <SheetHeader className="pr-11 text-left">
          <SheetTitle className="font-display text-[28px] font-bold leading-tight">{title}</SheetTitle>
          {description ? <SheetDescription>{description}</SheetDescription> : null}
        </SheetHeader>
        {children}
      </SheetContent>
    </Sheet>
  );
}

type FormFieldProps = {
  label: string;
  htmlFor?: string;
  required?: boolean;
  hint?: string;
  children: ReactNode;
  className?: string;
};

/** Label + control + optional hint, with consistent spacing across all form sheets. */
export function FormField({ label, htmlFor, required, hint, children, className }: FormFieldProps) {
  return (
    <div className={className}>
      <label className="text-sm font-semibold" htmlFor={htmlFor}>
        {label}
        {required ? " *" : ""}
      </label>
      <div className="mt-2">{children}</div>
      {hint ? <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

type FormSelectProps = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  className?: string;
  "aria-label"?: string;
};

/**
 * Styled replacement for native <select>: same API shape, but with a consistent
 * chevron and the shared input styling instead of the browser default.
 */
export function FormSelect({ id, value, onChange, options, className, "aria-label": ariaLabel }: FormSelectProps) {
  return (
    <div className={cn("relative", className)}>
      <select
        id={id}
        aria-label={ariaLabel}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-12 min-w-0 w-full appearance-none rounded-md border border-input bg-background px-3 pr-9 text-base text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" strokeWidth={1.75} />
    </div>
  );
}

export function FormError({ message }: { message: string }) {
  if (!message) return null;
  return <p role="alert" className="rounded-md bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">{message}</p>;
}

type FormSubmitProps = {
  saving: boolean;
  children: ReactNode;
  onSubmit?: (event: FormEvent) => void;
};

/** Full-width primary submit button shared by all form sheets. */
export function FormSubmit({ saving, children }: FormSubmitProps) {
  return (
    <div className="form-submit-bar">
    <Button type="submit" className="min-h-12 w-full text-base font-semibold" disabled={saving}>
      {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {children}
    </Button>
    </div>
  );
}
