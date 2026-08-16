export interface Contact {
  id: string;
  email: string;
  name: string;
  company: string;
  phone: string;
  source: string;
  tags: string[];
  status: 'active' | 'unsubscribed' | 'bounced';
  created_at: string;
  updated_at: string;
  /** Derived list memberships (attached by the API when includeLists=1). */
  list_ids?: string[];
}

export interface EmailList {
  id: string;
  name: string;
  description: string;
  contact_count: number;
  created_at: string;
}

export interface Campaign {
  id: string;
  name: string;
  subject: string;
  body: string;
  sender_name: string;
  sender_email: string;
  reply_to: string;
  recipient_count: number;
  sent_count: number;
  failed_count: number;
  status: 'draft' | 'sending' | 'sent' | 'scheduled' | 'failed';
  list_ids: string[];
  scheduled_at: string | null;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SingleEmail {
  to: string;
  to_name?: string;
  subject: string;
  body: string;
  sender_name?: string;
  sender_email?: string;
  reply_to?: string;
}

export interface Template {
  id: string;
  name: string;
  subject: string;
  body: string;
  category: string;
  is_default: boolean;
  created_at: string;
}

/** A template as defined in the static library (no id/timestamps yet). */
export interface TemplateSeed {
  name: string;
  subject: string;
  body: string;
  category: string;
}

export interface Integration {
  id: string;
  platform: string;
  display_name: string;
  api_key: string;
  api_secret: string;
  access_token: string;
  refresh_token: string;
  server_prefix: string;
  connected: boolean;
  config: Record<string, unknown>;
  last_sync: string | null;
  created_at: string;
}

export interface EmailLog {
  id: string;
  campaign_id: string | null;
  contact_email: string;
  contact_name: string;
  subject: string;
  status: 'pending' | 'sent' | 'failed' | 'queued';
  error: string;
  sent_at: string | null;
  created_at: string;
  /** Unique id embedded in tracking links / pixel for this delivery. */
  tracking_id: string | null;
  opened_at: string | null;
  clicked_at: string | null;
  open_count: number;
  click_count: number;
}

export interface TrackingEvent {
  id: string;
  log_id: string;
  type: 'open' | 'click';
  url: string | null;
  created_at: string;
}

export interface SMTPSettings {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from_name: string;
  from_email: string;
}

export interface ImportResult {
  success: number;
  failed: number;
  errors: string[];
  duplicates: number;
}

export interface CampaignStats {
  totalCampaigns: number;
  totalSent: number;
  totalContacts: number;
  totalLists: number;
  recentCampaigns: Campaign[];
}

export interface OutboxItem {
  id: string;
  type: string;
  payload: unknown;
  created_at: string;
  attempts: number;
}
