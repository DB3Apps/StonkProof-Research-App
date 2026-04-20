import React from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: any;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState;
  public props: ErrorBoundaryProps;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
    this.props = props;
  }

  static getDerivedStateFromError(error: any): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-paper flex items-center justify-center p-8 text-center">
          <div className="paper-card p-12 bg-white border-2 border-slate-900 space-y-6 max-w-lg">
            <AlertCircle size={64} className="text-rose-500 mx-auto" />
            <h2 className="text-3xl font-heading font-bold uppercase tracking-widest">System Failure</h2>
            <p className="font-sans text-slate-500 uppercase font-bold text-sm">The research lab has encountered a critical error.</p>
            <div className="bg-slate-50 p-4 doodle-border text-left overflow-auto max-h-40">
              <pre className="font-mono text-[10px] text-rose-600 whitespace-pre-wrap">
                {this.state.error?.message || String(this.state.error)}
              </pre>
            </div>
            <Button 
              onClick={() => window.location.reload()}
              className="w-full h-12 bg-slate-900 text-white rounded-none font-heading font-bold uppercase tracking-widest"
            >
              Reboot System
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
