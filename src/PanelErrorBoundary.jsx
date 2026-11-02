import React from 'react';
/** Limits a broken sheet to its modal instead of leaving an opaque page-wide overlay. */
export default class PanelErrorBoundary extends React.Component {
  state = { error: null };
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, details) { console.error('Erro de renderização do painel:', error, details.componentStack); }
  render() {
    if (!this.state.error) return this.props.children;
    return <div className="sheet-recovery surface" role="alert">
      <h2>Não foi possível mostrar esta ficha</h2>
      <p>Este painel encontrou um erro ao renderizar uma perícia. Os dados já salvos na mesa permanecem no banco.</p>
      <div className="card-actions">
        <button type="button" className="button secondary" onClick={()=>this.setState({error:null})}>Tentar novamente</button>
        <button type="button" className="button quiet" onClick={this.props.onClose}>Fechar ficha</button>
      </div>
    </div>;
  }
}
