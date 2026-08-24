import { forwardRef } from "react";
import { Chrome } from "lucide-react";
import { Button } from "@/components/ui/button";

interface GoogleAuthButtonProps {
  onClick: () => void;
  loading?: boolean;
  label?: string;
}

export const GoogleAuthButton = forwardRef<HTMLButtonElement, GoogleAuthButtonProps>(
  ({ onClick, loading, label = "Ga verder met Google" }, ref) => (
    <Button
      ref={ref}
      type="button"
      variant="outline"
      className="h-12 w-full rounded-full border-border bg-card font-semibold"
      onClick={onClick}
      disabled={loading}
    >
      {loading ? (
        <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      ) : (
        <Chrome className="mr-2 h-4 w-4 text-primary" />
      )}
      {label}
    </Button>
  ),
);

GoogleAuthButton.displayName = "GoogleAuthButton";
