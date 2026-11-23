import { useEffect, useState } from 'react';
import './App.css';
import DocumentList from './components/DocumentList.jsx';
import UploadComponent from './components/UploadComponent.jsx';
import { listDocuments } from './services/documentApi.js';

export default function App() {
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [listError, setListError] = useState('');
  const [notice, setNotice] = useState('');
  const [refreshVersion, setRefreshVersion] = useState(0);

  useEffect(() => {
    let isCurrent = true;

    async function loadDocuments() {
      setIsLoading(true);
      setListError('');

      try {
        const result = await listDocuments();
        if (isCurrent) {
          setDocuments(result);
        }
      } catch (error) {
        if (isCurrent) {
          setListError(error.message);
        }
      } finally {
        if (isCurrent) {
          setIsLoading(false);
        }
      }
    }

    void loadDocuments();
    return () => {
      isCurrent = false;
    };
  }, [refreshVersion]);

  function refreshDocuments() {
    setRefreshVersion((version) => version + 1);
  }

  function handleUploadComplete(document) {
    setNotice(`${document.originalName} foi enviado.`);
    refreshDocuments();
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#main" aria-label="DMS, início">
          <span className="brand-mark" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
          <span className="brand-name">DMS</span>
        </a>
        <div className="topbar-meta">
          <span className="connection-indicator" aria-hidden="true" />
          <span>ARQUIVO LOCAL</span>
          <span className="topbar-divider" />
          <span className="user-label">ANÔNIMO</span>
        </div>
      </header>

      <main id="main" className="workspace">
        <section className="page-heading" aria-labelledby="page-title">
          <div>
            <p className="eyebrow">BIBLIOTECA / DOCUMENTOS</p>
            <h1 id="page-title">Arquivos<span className="heading-period">.</span></h1>
          </div>
          <div className="document-total" aria-live="polite">
            <span className="total-number">{documents.length.toString().padStart(2, '0')}</span>
            <span className="total-label">ITENS<br />NA BIBLIOTECA</span>
          </div>
        </section>

        {notice && (
          <div className="notice" role="status">
            <span className="notice-mark" aria-hidden="true">+</span>
            <span>{notice}</span>
            <button
              className="notice-dismiss"
              type="button"
              aria-label="Fechar aviso"
              onClick={() => setNotice('')}
            >
              ×
            </button>
          </div>
        )}

        <div className="workspace-grid">
          <aside className="upload-panel" aria-labelledby="upload-title">
            <div className="panel-heading">
              <span className="section-index">01</span>
              <h2 id="upload-title">Adicionar arquivo</h2>
            </div>
            <UploadComponent onUploadComplete={handleUploadComplete} />
            <div className="storage-note">
              <span className="storage-note-icon" aria-hidden="true">i</span>
              <span>Arquivos armazenados neste servidor</span>
            </div>
          </aside>

          <section className="library-panel" aria-labelledby="library-title">
            <div className="library-heading">
              <div className="panel-heading">
                <span className="section-index">02</span>
                <h2 id="library-title">Biblioteca</h2>
              </div>
              <button
                className="refresh-button"
                type="button"
                onClick={refreshDocuments}
                disabled={isLoading}
                aria-label="Atualizar lista de documentos"
                title="Atualizar lista"
              >
                <span aria-hidden="true">↻</span>
              </button>
            </div>

            {listError ? (
              <div className="list-error" role="alert">
                <p>{listError}</p>
                <button className="text-button" type="button" onClick={refreshDocuments}>
                  Tentar novamente
                </button>
              </div>
            ) : (
              <DocumentList documents={documents} isLoading={isLoading} />
            )}
          </section>
        </div>

        <footer className="workspace-footer">
          <span>DMS <span className="footer-separator">/</span> GESTÃO DOCUMENTAL</span>
          <span>METADADOS EM MEMÓRIA</span>
        </footer>
      </main>
    </div>
  );
}