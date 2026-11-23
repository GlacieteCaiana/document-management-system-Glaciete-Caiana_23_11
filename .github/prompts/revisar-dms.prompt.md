---
name: revisar-dms
description: 'Revisa alterações do DMS antes do commit'
agent: agent
---

Revise somente as alterações atuais do Document Management System, sem modificar arquivos.

Verifique a organização das camadas do backend, o uso da API com prefixo /api e os fluxos de upload, listagem e download no frontend. Aponte problemas por gravidade, com caminho do arquivo e explicação objetiva. Se não encontrar problemas, informe isso e indique validações relevantes.

Não leia arquivos em backend/storage e não exponha conteúdo dos documentos armazenados.