import { Component, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error("[ErrorBoundary] Uncaught error:", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-background p-6 text-center gap-4">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-2">
            <span className="text-3xl">⚠️</span>
          </div>
          <h2 className="text-xl font-bold text-foreground">Qualcosa è andato storto</h2>
          <p className="text-sm text-muted-foreground max-w-xs">
            Si è verificato un errore inatteso. Prova a ricaricare la pagina.
          </p>
          <p className="text-xs font-mono text-muted-foreground bg-muted px-3 py-2 rounded max-w-sm break-all">
            {this.state.error?.message ?? "Errore sconosciuto"}
          </p>
          <Button
            className="bg-primary text-primary-foreground mt-2"
            onClick={() => window.location.reload()}
          >
            Ricarica la pagina
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
