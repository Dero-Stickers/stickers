import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// Input per PIN/password con icona occhio integrata (mostra/nascondi). Riusa
// l'Input standard, aggiunge il toggle a destra. forwardRef così funziona anche
// con react-hook-form ({...field}). Passa le props all'Input sottostante; il
// `type` è gestito internamente dal toggle, quindi non va passato dall'esterno.
type PinInputProps = Omit<React.ComponentProps<typeof Input>, "type">;

export const PinInput = React.forwardRef<HTMLInputElement, PinInputProps>(
  ({ className, ...props }, ref) => {
    const [visible, setVisible] = React.useState(false);
    return (
      <div className="relative">
        <Input
          ref={ref}
          type={visible ? "text" : "password"}
          className={cn("pr-10", className)}
          {...props}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Nascondi PIN" : "Mostra PIN"}
          title={visible ? "Nascondi PIN" : "Mostra PIN"}
          className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground hover:text-foreground"
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    );
  },
);
PinInput.displayName = "PinInput";
