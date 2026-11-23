const path = require('node:path');
const AppError = require('../services/appError');

function sanitizeDownloadName(originalName) {
  const name = String(originalName || 'documento')
    .replace(/\\/g, '/')
    .split('/')
    .pop()
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .trim();

  return name || 'documento';
}

function getSafeMimeType(mimeType) {
  return /^[\w!#$&^_.+-]+\/[\w!#$&^_.+-]+$/.test(mimeType || '')
    ? mimeType
    : 'application/octet-stream';
}

function createDocumentController(documentService) {
  return {
    async upload(request, response) {
      const document = await documentService.createDocument(request.file);
      response.status(201).json(document);
    },

    list(_request, response) {
      response.status(200).json({ documents: documentService.listDocuments() });
    },

    async download(request, response, next) {
      const { document, filePath } = await documentService.getDocumentForDownload(
        request.params.id,
      );
      const downloadName = sanitizeDownloadName(document.originalName);

      response.setHeader('Content-Type', getSafeMimeType(document.mimeType));
      response.download(filePath, path.basename(downloadName), (error) => {
        if (!error) {
          return;
        }

        if (response.headersSent) {
          return next(error);
        }

        if (error.code === 'ENOENT') {
          return next(new AppError(404, 'DOCUMENT_NOT_FOUND', 'Documento não encontrado.'));
        }

        return next(new AppError(500, 'DOWNLOAD_FAILED', 'Não foi possível baixar o documento.'));
      });
    },
  };
}

module.exports = createDocumentController;