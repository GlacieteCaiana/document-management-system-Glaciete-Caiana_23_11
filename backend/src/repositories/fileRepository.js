const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const multer = require('multer');

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function createFileRepository({ storageDirectory, maxFileSize }) {
  fs.mkdirSync(storageDirectory, { recursive: true });

  const storage = multer.diskStorage({
    destination: (_request, _file, callback) => callback(null, storageDirectory),
    filename: (_request, _file, callback) => callback(null, randomUUID()),
  });
  const upload = multer({
    storage,
    limits: { fileSize: maxFileSize, files: 1 },
  });

  function getFilePath(storedName) {
    if (typeof storedName !== 'string' || !UUID_PATTERN.test(storedName)) {
      throw new Error('Nome de arquivo interno inválido.');
    }

    return path.join(storageDirectory, storedName);
  }

  return {
    uploadSingle: upload.single('file'),

    getFilePath,

    async remove(storedName) {
      try {
        await fs.promises.unlink(getFilePath(storedName));
      } catch (error) {
        if (error.code !== 'ENOENT') {
          throw error;
        }
      }
    },

    async exists(storedName) {
      try {
        const stats = await fs.promises.stat(getFilePath(storedName));
        return stats.isFile();
      } catch (error) {
        if (error.code === 'ENOENT') {
          return false;
        }
        throw error;
      }
    },
  };
}

module.exports = createFileRepository;