// backend/src/document-templates/dto/update-document-template.dto.ts

/**
 * DTO для обновления шаблона документа.
 * Летит в PATCH /document-templates/:id
 */
export class UpdateDocumentTemplateDto {
  // Новое название шаблона
  name?: string;

  // Новый тип шаблона
  type?: string;

  // Новый текст/HTML шаблона
  content?: string;
}