import React from "react";

interface Props {
  children: React.ReactNode;
}
interface State {
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[YELEAKS] Render crash:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-[#fafafa] text-neutral-900 flex items-center justify-center p-4">
          <div className="max-w-xl w-full rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
            <h1 className="text-sm font-semibold uppercase tracking-widest mb-2">Something broke</h1>
            <pre className="whitespace-pre-wrap text-xs text-neutral-700 leading-relaxed">
              {this.state.error.message}
            </pre>
            <button
              type="button"
              onClick={() => this.setState({ error: null })}
              className="mt-4 text-xs font-semibold uppercase tracking-wider border border-neutral-200 rounded-lg px-3 py-2 hover:bg-neutral-50"
            >
              Retry
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
