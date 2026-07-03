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
    // Invio AUTOMATICO: un crash che mostra questa schermata è sempre rilevante.
    // Best-effort, non blocca; il bottone manuale resta come fallback se fallisce.
    void reportError({
      errorType: "client_crash",
      messageClean: error?.message ?? "Errore sconosciuto",
      stackTop: (error?.stack ?? info.componentStack ?? "")
        .split("\n")
        .slice(0, 8)
        .join("\n"),
      userNote: "App crashed (ErrorBoundary, auto)",
    }).then((ok) => {
      // Riflette l'esito nel bottone così l'utente non re-invia un duplicato.
      if (ok) this.setState((s) => (s.reportSent === "idle" ? { reportSent: "ok" } : null));
    });
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
        <div className="h-full overflow-y-auto flex flex-col items-center justify-center bg-background p-6 text-center gap-4">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-2">
            <span className="text-3xl">⚠️</span>
          </div>
          <h2 className="text-xl font-bold text-foreground">Qualcosa è andato storto</h2>
          {/* Testo COERENTE con lo stato reale dell'invio: niente "reinvia" quando
              è già partito. Il pulsante manuale compare solo se serve davvero
              (invio non ancora confermato o fallito), mai come duplicato inutile. */}
          <p className="text-sm text-muted-foreground max-w-xs">
            {(r === "idle" || r === "sending" || r === "ok") &&
              "Si è verificato un errore inatteso. La segnalazione è stata inviata: grazie."}
            {r === "fail" &&
              "Si è verificato un errore inatteso. Non siamo riusciti a inviare la segnalazione: puoi provare tu qui sotto."}
          </p>
          <p className="text-xs font-mono text-muted-foreground bg-muted px-3 py-2 rounded max-w-sm break-all">
            {this.state.error?.message ?? "Errore sconosciuto"}
          </p>
          <div className="flex flex-col gap-2 w-full max-w-xs">
            {/* Mostrato solo se l'invio automatico NON è (ancora) andato a buon fine. */}
            {r === "fail" && (
              <Button variant="outline" className="w-full" onClick={this.handleSendReport}>
                📨 Invia segnalazione
              </Button>
            )}
            {r === "sending" && (
              <Button variant="outline" className="w-full" disabled>
                Invio…
              </Button>
            )}
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
