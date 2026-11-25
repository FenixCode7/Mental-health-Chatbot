import { Component } from "react";

// Stops one broken part (e.g. the music player) from blanking the whole app.
export default class ErrorBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error, info) {
    console.error("Sukun component error:", error, info?.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    if (this.props.fallback !== undefined) return this.props.fallback;
    return (
      <div className="crash">
        <p>Something went wrong. Please reload the page.</p>
        <button className="btn-primary" onClick={() => window.location.reload()}>Reload</button>
      </div>
    );
  }
}
