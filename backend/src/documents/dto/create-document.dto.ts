// backend/src/documents/dto/create-document.dto.ts
export class CreateDocumentDto {
  // ID связанной сделки
  dealId!: string;

  // Тип документа (например: "Договор купли-продажи", "Акт приёма-передачи")
  type!: string;

  // Ссылка на файл (пока просто URL, позже можно сделать реальный upload).
  // Теперь не обязательна — документ может храниться только в content.
  fileUrl?: string;

  // Опциональный текст/HTML документа.
  // Можно будет использовать, если захочешь создавать документы без файла.
  content?: string;
}
