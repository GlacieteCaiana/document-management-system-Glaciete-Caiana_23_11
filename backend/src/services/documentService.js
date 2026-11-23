const { randomUUID } = require('node:crypto');
const AppError = require('./appError');

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function toPublicDocument(document) {
  const { storedName, ...publicDocument } = document;
  return publicDocument;
}

function createDocumentService({ documentRepository, fileRepository }) {
  async function removeUploadedFile(storedName) {
    try {
      await fileRepository.remove(storedName);
    } catch (_error) {
      console.error('Falha ao remover arquivo após erro no upload.');
    }
  }

  return {
    async createDocument(file) {
      if (!file) {
        throw new AppError(400, 'FILE_REQUIRED', 'Envie um arquivo no campo file.');
      }

      if (file.size === 0) {
        await removeUploadedFile(file.filename);
        throw new AppError(400, 'INVALID_FILE', 'O arquivo não pode estar vazio.');
      }

      const document = {
        id: randomUUID(),
        originalName: file.originalname || 'documento',
        size: file.size,
        uploadedAt: new Date().toISOString(),
        owner: 'anonymous',
        mimeType: file.mimetype || 'application/octet-stream',
        storedName: file.filename,
      };

      try {
        documentRepository.save(document);
      } catch (error) {
        await removeUploadedFile(file.filename);
        throw new AppError(500, 'UPLOAD_FAILED', 'Não foi possível salvar o documento.');
      }

      return toPublicDocument(document);
    },

    listDocuments() {
      return documentRepository.findAll().map(toPublicDocument);
    },

    async getDocumentForDownload(id) {
      if (!UUID_PATTERN.test(id)) {
        throw new AppError(400, 'INVALID_ID', 'O identificador do documento é inválido.');
      }

      const document = documentRepository.findById(id);
      if (!document || !(await fileRepository.exists(document.storedName))) {
        throw new AppError(404, 'DOCUMENT_NOT_FOUND', 'Documento não encontrado.');
      }

      return {
        document: toPublicDocument(document),
        filePath: fileRepository.getFilePath(document.storedName),
      };
    },
  };
}

module.exports = createDocumentService;