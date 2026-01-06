// backend/src/documents/dto/generate-from-template.dto.ts

/**
 * DTO для генерации документа по шаблону.
 * Летит в POST /documents/generate-from-template
 */
export class GenerateFromTemplateDto {
  // ID шаблона документа (DocumentTemplate.id)
  templateId!: string;

  // ID сделки, по которой заполняем плейсхолдеры (Deal.id)
  dealId!: string;
}
