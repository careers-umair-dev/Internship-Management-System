import { Component } from 'react';
import { AlertTriangle } from 'lucide-react';
import Button from '../ui/Button';

// Catches render errors so one broken page never white-screens the whole app.
export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) { return { error }; }

  componentDidCatch(error, info) { console.error('UI error:', error, info.componentStack); }

  componentDidUpdate(prev) {
    if (this.state.error && prev.resetKey !== this.props.resetKey) this.setState({ error: null }); // reset on navigation
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div role="alert" className="flex min-h-[50vh] flex-col items-center justify-center px-6 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-danger/10 text-danger"><AlertTriangle className="h-7 w-7" /></div>
        <h2 className="text-lg font-semibold text-foreground">Something went wrong</h2>
        <p className="mt-1 max-w-md text-sm text-muted">An unexpected error occurred while displaying this page. You can try again or reload the app.</p>
        <div className="mt-6 flex gap-2">
          <Button variant="outline" onClick={() => this.setState({ error: null })}>Try again</Button>
          <Button onClick={() => window.location.reload()}>Reload</Button>
        </div>
      </div>
    );
  }
}
