// backend/src/document-templates/dto/create-document-template.dto.ts

/**
 * DTO для создания шаблона документа.
 * Летит в POST /document-templates
 */
export class CreateDocumentTemplateDto {
  // Название шаблона, например "Договор купли-продажи"
  name!: string;

  // Тип шаблона, например "CONTRACT", "ACT", "SCHEDULE"
  type!: string;

  // Текст/HTML шаблона с плейсхолдерами {{client.fullName}}, {{unit.number}} и т.п.
  content!: string;
}
