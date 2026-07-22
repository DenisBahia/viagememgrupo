import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * Catches unexpected rendering errors so the whole app doesn't go blank/white.
 * Shows a friendly recovery screen instead.
 */
export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Erro inesperado capturado pelo ErrorBoundary:', error, info);
  }

  handleReload = () => {
    this.setState({ hasError: false });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-sm text-center">
            <div className="bg-amber-100 text-amber-600 p-3 rounded-full inline-flex mb-3">
              <AlertTriangle size={24} />
            </div>
            <h1 className="font-bold text-gray-800 mb-1">Ops, algo deu errado</h1>
            <p className="text-sm text-gray-500 mb-5">
              Ocorreu um erro inesperado ao exibir esta tela. Tente recarregar a página.
            </p>
            <button
              onClick={this.handleReload}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium"
            >
              <RefreshCw size={14} /> Recarregar página
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

