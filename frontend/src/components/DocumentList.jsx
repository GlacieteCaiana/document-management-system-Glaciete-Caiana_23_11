import DownloadButton from './DownloadButton.jsx';

function formatSize(size) {
  if (size < 1024) {
    return `${size} B`;
  }
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Data indisponível';
  }

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function getFileExtension(name) {
  const extension = name.split('.').pop();
  return extension && extension !== name ? extension.slice(0, 5).toUpperCase() : 'ARQ';
}

export default function DocumentList({ documents, isLoading }) {
  if (isLoading) {
    return (
      <div className="loading-list" aria-label="Carregando documentos" aria-busy="true">
        {[1, 2, 3].map((item) => <div className="loading-row" key={item} />)}
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="empty-state">
        <span className="empty-icon" aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
        <p>Nenhum documento ainda</p>
      </div>
    );
  }

  return (
    <ul className="document-list">
      {documents.map((document) => (
        <li className="document-row" key={document.id}>
          <span className="file-type" aria-hidden="true">{getFileExtension(document.originalName)}</span>
          <div className="document-info">
            <strong className="document-name" title={document.originalName}>
              {document.originalName}
            </strong>
            <span className="document-meta">
              {formatDate(document.uploadedAt)} <span aria-hidden="true">/</span> {formatSize(document.size)}
            </span>
          </div>
          <DownloadButton document={document} />
        </li>
      ))}
    </ul>
  );
}