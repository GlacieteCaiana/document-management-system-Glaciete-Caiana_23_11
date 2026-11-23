const express = require('express');

function createDocumentRouter(documentController, uploadSingle) {
  const router = express.Router();

  router.post('/documents', uploadSingle, documentController.upload);
  router.get('/documents', documentController.list);
  router.get('/documents/:id/download', documentController.download);

  return router;
}

module.exports = createDocumentRouter;