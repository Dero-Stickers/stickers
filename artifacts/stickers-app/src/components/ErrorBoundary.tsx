import { Component, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { reportError } from "@/lib/report-error";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  stack?: string;
  reportSent: "idle" | "sending" | "ok" | "fail";
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, reportSent: "idle" };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error("[ErrorBoundary] Uncaught error:", error, info.componentStack);
    this.setState({ stack: info.componentStack });
  }

  handleSendReport = async () => {
    if (this.state.reportSent === "sending" || this.state.reportSent === "ok") return;
    this.setState({ reportSent: "sending" });
    const ok = await reportError({
      errorType: "client_crash",
      messageClean: this.state.error?.message ?? "Errore sconosciuto",
      stackTop: (this.state.error?.stack ?? this.state.stack ?? "")
        .split("\n")
        .slice(0, 8)
        .join("\n"),
      userNote: "App crashed (ErrorBoundary)",
    });
    this.setState({ reportSent: ok ? "ok" : "fail" });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      const r = this.state.reportSent;
      return (
        <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-background p-6 text-center gap-4">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-2">
            <span className="text-3xl">⚠️</span>
          </div>
          <h2 className="text-xl font-bold text-foreground">Qualcosa è andato storto</h2>
          <p className="text-sm text-muted-foreground max-w-xs">
            Si è verificato un errore inatteso. Puoi inviare una segnalazione anonima per aiutarci a risolverlo.
          </p>
          <p className="text-xs font-mono text-muted-foreground bg-muted px-3 py-2 rounded max-w-sm break-all">
            {this.state.error?.message ?? "Errore sconosciuto"}
          </p>
          <div className="flex flex-col gap-2 w-full max-w-xs">
            <Button
              variant="outline"
              className="w-full"
              onClick={this.handleSendReport}
              disabled={r === "sending" || r === "ok"}
            >
              {r === "idle" && "📨 Invia segnalazione anonima"}
              {r === "sending" && "Invio…"}
              {r === "ok" && "✓ Segnalazione inviata, grazie!"}
              {r === "fail" && "Riprova invio segnalazione"}
            </Button>
            <Button
              className="bg-primary text-primary-foreground"
              onClick={() => window.location.reload()}
            >
              Ricarica la pagina
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
