const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { once } = require('node:events');
const app = require('../src/app');

test('o app backend é exportado', () => {
  assert.ok(app, 'o app deve estar definido');
  assert.strictEqual(typeof app, 'function', 'o app Express deve ser uma função');
});

async function startTestServer(t, options = {}) {
  const storageDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'dms-test-'));
  const server = app.createApp({ storageDirectory, ...options }).listen(0);
  await once(server, 'listening');

  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await fs.rm(storageDirectory, { recursive: true, force: true });
  });

  const { port } = server.address();
  return `http://127.0.0.1:${port}`;
}

test('faz upload, lista e baixa um documento pelas rotas /api', async (t) => {
  const baseUrl = await startTestServer(t);
  const form = new FormData();
  form.append('file', new Blob(['conteudo do documento'], { type: 'text/plain' }), 'nota.txt');

  const uploadResponse = await fetch(`${baseUrl}/api/documents`, {
    method: 'POST',
    body: form,
  });

  assert.strictEqual(uploadResponse.status, 201);
  const uploadedDocument = await uploadResponse.json();
  assert.strictEqual(uploadedDocument.originalName, 'nota.txt');
  assert.strictEqual(uploadedDocument.size, 21);
  assert.strictEqual(uploadedDocument.owner, 'anonymous');
  assert.strictEqual('storedName' in uploadedDocument, false);

  const listResponse = await fetch(`${baseUrl}/documents`);
  assert.strictEqual(listResponse.status, 200);
  assert.deepStrictEqual((await listResponse.json()).documents, [uploadedDocument]);

  const downloadResponse = await fetch(
    `${baseUrl}/api/documents/${uploadedDocument.id}/download`,
  );
  assert.strictEqual(downloadResponse.status, 200);
  assert.match(downloadResponse.headers.get('content-disposition'), /attachment/);
  assert.strictEqual(await downloadResponse.text(), 'conteudo do documento');
});

test('retorna erros para arquivo ausente e acima do limite', async (t) => {
  const baseUrl = await startTestServer(t, { maxFileSize: 4 });

  const missingFileResponse = await fetch(`${baseUrl}/api/documents`, {
    method: 'POST',
    body: new FormData(),
  });
  assert.strictEqual(missingFileResponse.status, 400);
  assert.strictEqual((await missingFileResponse.json()).error.code, 'FILE_REQUIRED');

  const emptyForm = new FormData();
  emptyForm.append('file', new Blob([]), 'empty.txt');
  const emptyFileResponse = await fetch(`${baseUrl}/api/documents`, {
    method: 'POST',
    body: emptyForm,
  });
  assert.strictEqual(emptyFileResponse.status, 400);
  assert.strictEqual((await emptyFileResponse.json()).error.code, 'INVALID_FILE');

  const form = new FormData();
  form.append('file', new Blob(['12345']), 'large.txt');
  const oversizedResponse = await fetch(`${baseUrl}/api/documents`, {
    method: 'POST',
    body: form,
  });
  assert.strictEqual(oversizedResponse.status, 413);
  assert.strictEqual((await oversizedResponse.json()).error.code, 'FILE_TOO_LARGE');
});

test('retorna 404 para documento inexistente e mantém o health check', async (t) => {
  const baseUrl = await startTestServer(t);

  const invalidIdResponse = await fetch(`${baseUrl}/api/documents/not-a-uuid/download`);
  assert.strictEqual(invalidIdResponse.status, 400);
  assert.strictEqual((await invalidIdResponse.json()).error.code, 'INVALID_ID');

  const missingDocumentResponse = await fetch(
    `${baseUrl}/api/documents/550e8400-e29b-41d4-a716-446655440000/download`,
  );
  assert.strictEqual(missingDocumentResponse.status, 404);
  assert.strictEqual((await missingDocumentResponse.json()).error.code, 'DOCUMENT_NOT_FOUND');

  const healthResponse = await fetch(`${baseUrl}/health`);
  assert.strictEqual(healthResponse.status, 200);
  assert.deepStrictEqual(await healthResponse.json(), { status: 'ok' });
});
