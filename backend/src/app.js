// Seed do servidor backend do Document Management System.
//
// Este arquivo é apenas um ponto de partida mínimo. Ao longo do workshop você
// vai usar o Agent Mode do GitHub Copilot para construir as camadas:
//   - routes/       (definição das rotas)
//   - controllers/  (entrada HTTP e validação)
//   - services/     (regras de negócio)
//   - repositories/ (persistência: arquivos locais + metadados em memória)
//
// Restrição do projeto: uploads são gravados no filesystem local da aplicação
// usando multer com diskStorage. Não utilize provedores externos.

const express = require('express');
const path = require('node:path');
const createDocumentRepository = require('./repositories/documentRepository');
const createFileRepository = require('./repositories/fileRepository');
const createDocumentService = require('./services/documentService');
const createDocumentController = require('./controllers/documentController');
const createDocumentRouter = require('./routes/documentRoutes');
const { errorHandler } = require('./controllers/errorController');

const PORT = process.env.PORT || 3000;
const DEFAULT_MAX_FILE_SIZE = 10 * 1024 * 1024;

function getMaxFileSize(value = process.env.MAX_FILE_SIZE_BYTES) {
  if (value === undefined) {
    return DEFAULT_MAX_FILE_SIZE;
  }

  const maxFileSize = Number(value);
  if (!Number.isSafeInteger(maxFileSize) || maxFileSize <= 0) {
    throw new Error('MAX_FILE_SIZE_BYTES deve ser um inteiro positivo.');
  }

  return maxFileSize;
}

function createApp(options = {}) {
  const app = express();
  const fileRepository = createFileRepository({
    storageDirectory: options.storageDirectory || path.resolve(__dirname, '../storage'),
    maxFileSize: options.maxFileSize ?? getMaxFileSize(),
  });
  const documentRepository = options.documentRepository || createDocumentRepository();
  const documentService = createDocumentService({ documentRepository, fileRepository });
  const documentController = createDocumentController(documentService);
  const documentRouter = createDocumentRouter(
    documentController,
    fileRepository.uploadSingle,
  );

  app.use(express.json());
  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api', documentRouter);
  app.use('/', documentRouter);
  app.use(errorHandler);

  return app;
}

const app = createApp();

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`DMS backend ouvindo na porta ${PORT}`);
  });
}

module.exports = app;
module.exports.createApp = createApp;
