export type ImportSource =
  | "raindrop"
  | "pocket"
  | "notion"
  | "browser"
  | "generic";

export type ParsedImportItem = {
  url: string;
  title: string;
  description?: string;
  tags?: string[];
  folder?: string;
  note?: string;
  createdAt?: string;
};

export type ParseResult = {
  source: ImportSource;
  items: ParsedImportItem[];
  folders: string[];
  columns?: string[];
};

export type ColumnMapping = {
  url: string;
  title: string;
  description?: string;
  tags?: string;
  folder?: string;
  note?: string;
};
