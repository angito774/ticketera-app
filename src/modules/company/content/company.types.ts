export interface CompanySection {
  id: string;
  title: string;
  paragraphs: string[];
  items?: string[];
}

export interface CompanyDocument {
  title: string;
  intro: string;
  sections: CompanySection[];
  cta?: { label: string; href: string };
}
