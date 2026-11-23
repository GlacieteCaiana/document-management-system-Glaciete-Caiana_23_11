const API_BASE = '/api';

async function readResponse(response) {
  if (response.ok) {
    return response;
  }

  let message = 'Não foi possível concluir a solicitação.';
  try {
    const body = await response.json();
    message = body.error?.message || message;
  } catch (_error) {
    // Respostas sem JSON usam a mensagem padrão.
  }

  throw new Error(message);
}

export async function listDocuments() {
  const response = await readResponse(await fetch(`${API_BASE}/documents`));
  const body = await response.json();
  return body.documents;
}

export async function uploadDocument(file) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await readResponse(await fetch(`${API_BASE}/documents`, {
    method: 'POST',
    body: formData,
  }));

  return response.json();
}

export async function downloadDocument(document) {
  const response = await readResponse(await fetch(
    `${API_BASE}/documents/${encodeURIComponent(document.id)}/download`,
  ));
  const fileBlob = await response.blob();
  const objectUrl = URL.createObjectURL(fileBlob);
  const anchor = window.document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = document.originalName || 'documento';
  anchor.style.display = 'none';
  window.document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}