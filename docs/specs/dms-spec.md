# Especificação - Document Management System

## 1. Objetivo

Entregar uma aplicação web simples para enviar, listar e baixar documentos, armazenando os arquivos no filesystem local e mantendo seus metadados em memória.

## 2. Escopo

### Dentro do escopo

- Envio de um documento por requisição.
- Listagem dos documentos enviados durante a execução atual do backend.
- Download de um documento pelo identificador.
- Interface web para envio, listagem, atualização da lista e download.
- Tratamento consistente de validações e erros nos limites HTTP.

### Fora do escopo

- Autenticação, autorização e isolamento real de dados entre usuários.
- Armazenamento em nuvem, provedores externos ou banco de dados.
- Persistência ou recuperação automática dos metadados após reiniciar o backend.
- Versionamento, edição, exclusão, busca, paginação e compartilhamento de documentos.
- Validação por antivírus ou restrição a uma lista de tipos de arquivo.

### Premissas do MVP

- Como o seed não define autenticação, todos os documentos pertencem ao usuário genérico `anonymous`; a listagem não é isolada por usuário.
- Cada requisição de upload contém exatamente um arquivo no campo multipart `file`.
- São aceitos tipos amplos de arquivo. Arquivos vazios são rejeitados.
- O limite padrão é 10 MiB por arquivo e pode ser configurado por `MAX_FILE_SIZE_BYTES`.
- Os arquivos são gravados em `backend/storage`. O nome físico é gerado pela aplicação e não é derivado do nome recebido.
- Os metadados ficam em memória. Ao reiniciar o processo, eles são perdidos; arquivos locais que permanecerem não serão listados nem estarão disponíveis por ID. Reconciliação e limpeza de arquivos órfãos não fazem parte do MVP.

## 3. Requisitos funcionais

| ID | Requisito | Critério de aceite |
| --- | --- | --- |
| RF-01 | O usuário pode enviar um documento. | Um upload válido grava o arquivo localmente e retorna `201` com os metadados do documento. |
| RF-02 | O sistema valida o upload. | Campo ausente, arquivo vazio ou requisição multipart inválida retorna `400`; arquivo acima do limite retorna `413`; nenhum metadado de upload malsucedido é listado. |
| RF-03 | O usuário pode listar documentos. | `GET /documents` retorna os metadados disponíveis em memória, ordenados do mais recente para o mais antigo. Lista vazia retorna `200` com array vazio. |
| RF-04 | O usuário pode baixar um documento pelo identificador. | Um ID existente retorna os bytes do arquivo com tipo de conteúdo e nome de download apropriados; ID inexistente retorna `404`. |
| RF-05 | O frontend permite usar o fluxo principal. | A interface permite selecionar e enviar um arquivo, exibe o resultado, lista documentos e oferece uma ação de download por documento. |
| RF-06 | O frontend comunica estados e erros. | A interface apresenta estado de carregamento, estado vazio e mensagens compreensíveis para falhas de upload, listagem ou download. |
| RF-07 | O sistema mantém o health check. | `GET /health` continua retornando `200` e `{ "status": "ok" }`. |

## 4. Requisitos não funcionais

| ID | Requisito |
| --- | --- |
| RNF-01 | O backend usa Node.js, Express e CommonJS; os testes backend usam o runner nativo `node:test`. |
| RNF-02 | O backend segue as camadas `routes -> controllers -> services -> repositories`; cada camada delega para a próxima e as camadas internas não dependem de Express. |
| RNF-03 | O upload usa `multer` com `diskStorage`; os arquivos são armazenados somente no filesystem local em `backend/storage`. |
| RNF-04 | Os metadados são mantidos em memória nesta fase. Reiniciar o processo pode tornar metadados inacessíveis mesmo que o arquivo ainda exista no disco. |
| RNF-05 | Configurações operacionais são obtidas por variáveis de ambiente. `PORT` usa `3000` como padrão e `MAX_FILE_SIZE_BYTES` usa `10485760` como padrão. Valores inválidos devem impedir configuração ambígua ou ser substituídos por defaults documentados. |
| RNF-06 | O nome recebido do usuário nunca é usado como caminho de armazenamento. O identificador interno e o nome físico são gerados pelo servidor para evitar traversal e colisões. |
| RNF-07 | As rotas não devem expor caminhos locais, stack traces ou detalhes internos em respostas HTTP de erro. |
| RNF-08 | O frontend é implementado com React e Vite; suas chamadas usam `fetch` pelo prefixo `/api`, conforme o proxy de desenvolvimento existente. |
| RNF-09 | Os testes devem cobrir resultados de sucesso e erros observáveis dos contratos, usando armazenamento isolado ou temporário quando apropriado para não depender de arquivos reais persistentes. |

## 5. Modelo de dados

### Documento

| Campo | Tipo | Visibilidade | Descrição |
| --- | --- | --- | --- |
| `id` | string (UUID) | Público | Identificador único gerado pelo servidor. |
| `originalName` | string | Público | Nome informado para o arquivo, tratado como dado não confiável. |
| `size` | number | Público | Tamanho do arquivo em bytes. |
| `uploadedAt` | string (ISO 8601 UTC) | Público | Data e hora em que o upload foi aceito. |
| `owner` | string | Público | Identificador do dono; será `anonymous` no MVP. |
| `mimeType` | string | Público | Tipo informado/detectado pelo middleware; usar `application/octet-stream` quando ausente ou não confiável. Não é uma validação de segurança. |
| `storedName` | string | Interno | Nome gerado pelo servidor para localizar o arquivo dentro de `backend/storage`; nunca deve ser retornado pela API. |

O repositório de metadados mantém documentos em memória indexados por `id`. A ordenação da listagem é decrescente por `uploadedAt`; em empate, pode-se usar `id` como critério estável. O conteúdo do arquivo não é armazenado no objeto de metadados.

Se a gravação em disco for concluída, mas o registro do metadado falhar, o serviço deve tentar remover o arquivo recém-gravado e retornar erro interno. Falhas durante a remoção devem ser registradas no backend sem expor o caminho ou detalhes ao cliente.

## 6. Contratos de API

As rotas do backend não incluem `/api`. No desenvolvimento, o frontend chama `/api/...` e o proxy Vite remove esse prefixo antes de encaminhar ao backend.

### Formato comum de erro

```json
{
  "error": {
    "code": "FILE_REQUIRED",
    "message": "Envie um arquivo no campo file."
  }
}
```

`code` é estável para tratamento pelo frontend; `message` é uma mensagem segura e legível em português. Erros inesperados retornam mensagem genérica, sem stack trace ou caminho local.

### `POST /upload`

Envia um arquivo usando `multipart/form-data`.

- Campo obrigatório: `file` (um arquivo).
- Limite: valor de `MAX_FILE_SIZE_BYTES`, padrão `10485760` bytes.
- Tipos aceitos: amplos; não há whitelist de MIME type/extensão no MVP.

Sucesso: `201 Created`, `Content-Type: application/json`.

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "originalName": "relatorio.pdf",
  "size": 24576,
  "uploadedAt": "2026-11-23T12:00:00.000Z",
  "owner": "anonymous",
  "mimeType": "application/pdf"
}
```

Erros:

| Status | Código | Quando |
| --- | --- | --- |
| `400` | `FILE_REQUIRED` | Campo `file` ausente. |
| `400` | `INVALID_FILE` | Arquivo vazio, multipart malformado ou mais de um arquivo enviado. |
| `413` | `FILE_TOO_LARGE` | Tamanho excede `MAX_FILE_SIZE_BYTES`. |
| `500` | `UPLOAD_FAILED` | Falha inesperada ao gravar arquivo ou registrar metadados. |

### `GET /documents`

Lista os documentos registrados em memória, do mais recente para o mais antigo. Não há paginação no MVP.

Sucesso: `200 OK`, `Content-Type: application/json`.

```json
{
  "documents": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "originalName": "relatorio.pdf",
      "size": 24576,
      "uploadedAt": "2026-11-23T12:00:00.000Z",
      "owner": "anonymous",
      "mimeType": "application/pdf"
    }
  ]
}
```

Quando não houver documentos, retorna `200` e `{ "documents": [] }`. Erro inesperado retorna `500` com código `LIST_FAILED`.

### `GET /documents/:id/download`

Baixa o conteúdo binário de um documento registrado.

- Sucesso: `200 OK`.
- `Content-Type`: `mimeType` do documento; usar `application/octet-stream` como fallback.
- `Content-Disposition`: `attachment` com o nome original devidamente sanitizado/escapado para header HTTP.
- O caminho físico é resolvido exclusivamente a partir do `storedName` interno e dentro do diretório de armazenamento.

Erros:

| Status | Código | Quando |
| --- | --- | --- |
| `400` | `INVALID_ID` | O parâmetro `id` não tem formato válido de UUID. |
| `404` | `DOCUMENT_NOT_FOUND` | Não existe metadado para o ID ou o arquivo não está disponível. |
| `500` | `DOWNLOAD_FAILED` | Ocorre outra falha ao ler ou transmitir o arquivo. |

Se o metadado existir, mas o arquivo tiver sido removido do disco, responder `404` e registrar o problema no backend. As respostas de erro usam o formato comum JSON; respostas de sucesso são binárias.

## 7. Decisões arquiteturais

- **Routes:** registram os caminhos e conectam middleware e controllers.
- **Controllers:** adaptam HTTP para chamadas de serviço, validam parâmetros básicos e traduzem resultado/erro em status e resposta.
- **Services:** concentram regras do fluxo de upload, listagem e download; não dependem de Express.
- **Repositories:** isolam persistência em memória dos metadados e operações necessárias para localizar documentos. O acesso ao filesystem deve permanecer encapsulado no fluxo de persistência/armazenamento, sem vazar caminhos para controllers ou respostas.
- **Upload:** `multer` com `diskStorage` grava em `backend/storage`; o nome físico é gerado pelo servidor. O serviço registra metadados somente após o arquivo ser gravado e tenta compensar removendo-o se o registro falhar.
- **Frontend:** componentes React apresentam upload, lista e download; um serviço frontend centraliza chamadas `fetch` e tratamento do formato comum de erro.
- **Dependências:** priorizar dependências já presentes nos `package.json`; não introduzir banco ou serviço externo.

## 8. Plano de execução

As etapas abaixo descrevem trabalho futuro. Nesta tarefa de planejamento, somente este documento deve ser criado; não executar nem criar arquivos de implementação backend ou frontend.

1. **Preparação do backend:** confirmar configuração de `PORT` e limite de upload; definir tratamento comum de erros e diretório local de armazenamento.
2. **Persistência e regras de negócio:** implementar abstração de metadados em memória e serviços de upload, listagem e recuperação por ID, incluindo compensação para falhas parciais.
3. **API de documentos:** adicionar middleware `multer` e rotas/controllers para `POST /upload`, `GET /documents` e `GET /documents/:id/download`, mantendo `/health`.
4. **Testes backend:** cobrir uploads válidos e inválidos, listagem vazia e populada, download existente/inexistente, limite de tamanho, erros e limpeza em falhas, usando diretório de teste isolado.
5. **Serviço e interface frontend:** centralizar chamadas HTTP e implementar estados de envio, carregamento, lista vazia, erros e download, sem duplicar lógica de API nos componentes.
6. **Integração e validação:** executar testes backend, build frontend e fluxo integrado via proxy Vite; corrigir divergências entre contratos e comportamento observado.

## 9. Critérios de conclusão da especificação

- As seções do modelo em `docs/specs/spec-template.md` estão cobertas.
- Requisitos, dados e respostas da API são coerentes entre si e verificáveis.
- O armazenamento é estritamente local via `multer`/`diskStorage`; metadados permanecem em memória no MVP.
- O plano lista implementação backend/frontend como etapas futuras, sem executá-las nesta tarefa.
- O único arquivo criado por esta tarefa é `docs/specs/dms-spec.md`.
