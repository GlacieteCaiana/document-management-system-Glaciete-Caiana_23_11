function createDocumentRepository() {
  const documents = new Map();

  return {
    save(document) {
      documents.set(document.id, document);
      return document;
    },

    findAll() {
      return [...documents.values()].sort((left, right) => {
        const dateOrder = right.uploadedAt.localeCompare(left.uploadedAt);
        return dateOrder || left.id.localeCompare(right.id);
      });
    },

    findById(id) {
      return documents.get(id) || null;
    },
  };
}

module.exports = createDocumentRepository;