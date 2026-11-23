import { useRef, useState } from 'react';
import { uploadDocument } from '../services/documentApi.js';

function formatSize(size) {
  if (size < 1024) {
    return `${size} B`;
  }
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export default function UploadComponent({ onUploadComplete }) {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  function selectFile(selectedFile) {
    setError('');
    setFile(selectedFile || null);
  }

  function handleDrop(event) {
    event.preventDefault();
    setIsDragging(false);
    selectFile(event.dataTransfer.files[0]);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!file || isUploading) {
      return;
    }

    setError('');
    setIsUploading(true);
    try {
      const uploadedDocument = await uploadDocument(file);
      setFile(null);
      if (inputRef.current) {
        inputRef.current.value = '';
      }
      onUploadComplete(uploadedDocument);
    } catch (uploadError) {
      setError(uploadError.message);
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <form className="upload-form" onSubmit={handleSubmit}>
      <label
        className={`drop-zone${isDragging ? ' is-dragging' : ''}${file ? ' has-file' : ''}`}
        htmlFor="document-file"
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          id="document-file"
          className="visually-hidden"
          type="file"
          onChange={(event) => selectFile(event.target.files[0])}
          disabled={isUploading}
        />
        <span className="drop-zone-symbol" aria-hidden="true">+</span>
        {file ? (
          <span className="selected-file">
            <strong>{file.name}</strong>
            <small>{formatSize(file.size)}</small>
          </span>
        ) : (
          <span className="drop-zone-copy">
            <strong>Selecionar arquivo</strong>
            <small>ou solte nesta área</small>
          </span>
        )}
      </label>

      {error && <p className="form-error" role="alert">{error}</p>}

      <button className="upload-button" type="submit" disabled={!file || isUploading}>
        <span>{isUploading ? 'Enviando...' : 'Enviar documento'}</span>
        <span className="button-arrow" aria-hidden="true">↗</span>
      </button>
    </form>
  );
}