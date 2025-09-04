export interface DealStage {
  id: string;
  name: string;
  position: number;
  created_at?: string;
}

export interface Company {
  id: string;
  name: string;
  phone?: string;
  website?: string;
  notes?: string;
  created_by?: string;
  created_at?: string;
}

export interface Contact {
  id: string;
  company_id?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  title?: string;
  tags?: string[];
  created_by?: string;
  created_at?: string;
  company?: Company;
}

export interface Deal {
  id: string;
  title: string;
  company_id?: string;
  contact_id?: string;
  amount?: number;
  stage_id?: string;
  owner_id?: string;
  created_at: string;
  company?: Company;
  contact?: Contact;
  stage?: DealStage;
}

export interface DealWithRelations extends Deal {
  company?: Company;
  contact?: Contact;
  stage?: DealStage;
}

export interface KanbanColumn {
  id: string;
  title: string;
  deals: DealWithRelations[];
}

export interface KanbanData {
  columns: KanbanColumn[];
  deals: DealWithRelations[];
}

// Activity types
export interface Activity {
  id: string;
  deal_id?: string;
  contact_id?: string;
  type: 'note' | 'task' | 'call' | 'email' | 'sms';
  summary: string;
  due_at?: string;
  done: boolean;
  created_by?: string;
  created_at: string;
  deal?: Deal;
  contact?: Contact;
}

// Contact form types
export interface ContactFormData {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  title?: string;
  company_id?: string;
  tags?: string[];
}

// Activity form types
export interface ActivityFormData {
  type: 'note' | 'task' | 'call' | 'email' | 'sms';
  summary: string;
  due_at?: string;
  done?: boolean;
}
