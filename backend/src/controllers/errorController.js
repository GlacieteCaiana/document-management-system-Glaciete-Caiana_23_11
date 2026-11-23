const multer = require('multer');
const AppError = require('../services/appError');

function getOperationError(request) {
  const requestPath = request.path;

  if (request.method === 'POST' && /(?:^|\/)documents$/.test(requestPath)) {
    return { code: 'UPLOAD_FAILED', message: 'Não foi possível salvar o documento.' };
  }

  if (request.method === 'GET' && /(?:^|\/)documents$/.test(requestPath)) {
    return { code: 'LIST_FAILED', message: 'Não foi possível listar os documentos.' };
  }

  if (request.method === 'GET' && /(?:^|\/)documents\/[^/]+\/download$/.test(requestPath)) {
    return { code: 'DOWNLOAD_FAILED', message: 'Não foi possível baixar o documento.' };
  }

  return { code: 'INTERNAL_ERROR', message: 'Ocorreu um erro interno.' };
}

function errorHandler(error, request, response, next) {
  if (response.headersSent) {
    return next(error);
  }

  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return response.status(413).json({
        error: { code: 'FILE_TOO_LARGE', message: 'O arquivo excede o limite permitido.' },
      });
    }

    return response.status(400).json({
      error: { code: 'INVALID_FILE', message: 'A requisição de upload é inválida.' },
    });
  }

  if (error.message === 'Unexpected end of form') {
    return response.status(400).json({
      error: { code: 'INVALID_FILE', message: 'A requisição multipart é inválida.' },
    });
  }

  if (error instanceof AppError) {
    return response.status(error.status).json({
      error: { code: error.code, message: error.message },
    });
  }

  console.error('Erro inesperado ao processar requisição.');
  const operationError = getOperationError(request);
  return response.status(500).json({
    error: operationError,
  });
}

module.exports = { errorHandler };