import React from "react";

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error({ message: error.message, componentStack: info.componentStack });
  }

  render() {
    if (this.state.error) {
      return (
        <div className="app">
          <main className="content">
            <section className="panel">
              <h1>Prislo je do napake v aplikaciji.</h1>
              <p className="muted">Osvezi stran. Ce se napaka ponovi, javi administratorju.</p>
              <button className="btn primary" onClick={() => window.location.reload()}>Osvezi</button>
            </section>
          </main>
        </div>
      );
    }
    return this.props.children;
  }
}
