export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type SupabaseTable<Row, Insert, Update = Partial<Row>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

type PractitionerProfileRow = {
  user_id: string;
  display_name: string | null;
  role: string | null;
  organization: string | null;
  created_at: string;
  updated_at: string;
};

type CatalogCompanyRefRow = {
  slug: string;
  name: string;
  website_domain: string | null;
  is_active: boolean;
  last_synced_at: string;
};

type CatalogProductRefRow = {
  slug: string;
  name: string;
  url: string | null;
  company_slug: string | null;
  is_active: boolean;
  yaml_hash: string | null;
  last_synced_at: string;
};

type SavedProductRow = {
  practitioner_id: string;
  product_slug: string;
  created_at: string;
};

type CompanyFollowRow = {
  practitioner_id: string;
  company_slug: string;
  created_at: string;
};

type EvaluationRow = {
  id: string;
  practitioner_id: string;
  name: string;
  goal: string | null;
  requirements: string | null;
  risks: string | null;
  decision: string | null;
  created_at: string;
  updated_at: string;
};

type EvaluationProductRow = {
  evaluation_id: string;
  product_slug: string;
  position: number | null;
  created_at: string;
};

type ProductNoteRow = {
  practitioner_id: string;
  product_slug: string;
  body: string;
  created_at: string;
  updated_at: string;
};

type LegacyPractitionerNoteRow = {
  id: string;
  practitioner_id: string;
  product_slug: string | null;
  evaluation_id: string | null;
  body: string;
  created_at: string;
  updated_at: string;
};

type CompanyOptInRow = {
  id: string;
  practitioner_id: string;
  company_slug: string;
  product_slug: string | null;
  consent_text: string;
  consented_at: string;
  revoked_at: string | null;
};

type SourceLinkRow = {
  id: string;
  product_slug: string | null;
  company_slug: string | null;
  url: string;
  source_type: string;
  discovered_by: string;
  discovered_at: string;
  last_checked_at: string | null;
  content_hash: string | null;
  notes: string | null;
};

type EvidenceCandidateRow = {
  id: string;
  source_link_id: string | null;
  product_slug: string | null;
  company_slug: string | null;
  criterion: string | null;
  claim_text: string;
  claim_value: Json | null;
  evidence_state:
    | "unknown"
    | "confirmed"
    | "vendor_claimed"
    | "conflicting"
    | "rejected";
  extracted_by: string;
  extracted_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  private_notes: string | null;
};

type PublishedUpdateRow = {
  id: string;
  slug: string;
  company_slug: string | null;
  product_slug: string | null;
  title: string;
  summary: string;
  content_path: string;
  source_url: string | null;
  published_at: string;
  created_at: string;
  updated_at: string;
};

type UpdateReadRow = {
  practitioner_id: string;
  update_id: string;
  read_at: string;
};

type EditorialSubmissionRow = {
  id: string;
  submission_type: "correction" | "company_update";
  relationship:
    | "practitioner"
    | "company_employee"
    | "founder"
    | "agency"
    | "other";
  product_slug: string | null;
  company_slug: string | null;
  source_url: string;
  message: string;
  contact_email: string;
  submitted_by: string | null;
  status: "pending" | "reviewing" | "accepted" | "rejected";
  submitted_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  operator_notes: string | null;
};

export type Database = {
  public: {
    Tables: {
      practitioner_profiles: SupabaseTable<
        PractitionerProfileRow,
        {
          user_id: string;
          display_name?: string | null;
          role?: string | null;
          organization?: string | null;
          created_at?: string;
          updated_at?: string;
        }
      >;
      catalog_company_refs: SupabaseTable<
        CatalogCompanyRefRow,
        {
          slug: string;
          name: string;
          website_domain?: string | null;
          is_active?: boolean;
          last_synced_at?: string;
        }
      >;
      catalog_product_refs: SupabaseTable<
        CatalogProductRefRow,
        {
          slug: string;
          name: string;
          url?: string | null;
          company_slug?: string | null;
          is_active?: boolean;
          yaml_hash?: string | null;
          last_synced_at?: string;
        }
      >;
      saved_products: SupabaseTable<
        SavedProductRow,
        {
          practitioner_id: string;
          product_slug: string;
          created_at?: string;
        }
      >;
      company_follows: SupabaseTable<
        CompanyFollowRow,
        {
          practitioner_id: string;
          company_slug: string;
          created_at?: string;
        }
      >;
      evaluations: SupabaseTable<
        EvaluationRow,
        {
          id?: string;
          practitioner_id: string;
          name: string;
          goal?: string | null;
          requirements?: string | null;
          risks?: string | null;
          decision?: string | null;
          created_at?: string;
          updated_at?: string;
        }
      >;
      evaluation_products: SupabaseTable<
        EvaluationProductRow,
        {
          evaluation_id: string;
          product_slug: string;
          position?: number | null;
          created_at?: string;
        }
      >;
      product_notes: SupabaseTable<
        ProductNoteRow,
        {
          practitioner_id: string;
          product_slug: string;
          body?: string;
          created_at?: string;
          updated_at?: string;
        }
      >;
      legacy_practitioner_notes: SupabaseTable<
        LegacyPractitionerNoteRow,
        {
          id?: string;
          practitioner_id: string;
          product_slug?: string | null;
          evaluation_id?: string | null;
          body: string;
          created_at?: string;
          updated_at?: string;
        }
      >;
      company_opt_ins: SupabaseTable<
        CompanyOptInRow,
        {
          id?: string;
          practitioner_id: string;
          company_slug: string;
          product_slug?: string | null;
          consent_text: string;
          consented_at?: string;
          revoked_at?: string | null;
        }
      >;
      source_links: SupabaseTable<
        SourceLinkRow,
        {
          id?: string;
          product_slug?: string | null;
          company_slug?: string | null;
          url: string;
          source_type: string;
          discovered_by?: string;
          discovered_at?: string;
          last_checked_at?: string | null;
          content_hash?: string | null;
          notes?: string | null;
        }
      >;
      evidence_candidates: SupabaseTable<
        EvidenceCandidateRow,
        {
          id?: string;
          source_link_id?: string | null;
          product_slug?: string | null;
          company_slug?: string | null;
          criterion?: string | null;
          claim_text: string;
          claim_value?: Json | null;
          evidence_state?: EvidenceCandidateRow["evidence_state"];
          extracted_by?: string;
          extracted_at?: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          private_notes?: string | null;
        }
      >;
      published_updates: SupabaseTable<
        PublishedUpdateRow,
        {
          id?: string;
          slug: string;
          company_slug?: string | null;
          product_slug?: string | null;
          title: string;
          summary: string;
          content_path: string;
          source_url?: string | null;
          published_at: string;
          created_at?: string;
          updated_at?: string;
        }
      >;
      update_reads: SupabaseTable<
        UpdateReadRow,
        {
          practitioner_id: string;
          update_id: string;
          read_at?: string;
        }
      >;
      editorial_submissions: SupabaseTable<
        EditorialSubmissionRow,
        {
          id?: string;
          submission_type: EditorialSubmissionRow["submission_type"];
          relationship: EditorialSubmissionRow["relationship"];
          product_slug?: string | null;
          company_slug?: string | null;
          source_url: string;
          message: string;
          contact_email: string;
          submitted_by?: string | null;
          status?: EditorialSubmissionRow["status"];
          submitted_at?: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          operator_notes?: string | null;
        }
      >;
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

type PublicSchema = Database[Extract<keyof Database, "public">];

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer Row;
    }
    ? Row
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer Row;
      }
      ? Row
      : never
    : never;

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer Insert;
    }
    ? Insert
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer Insert;
      }
      ? Insert
      : never
    : never;

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer Update;
    }
    ? Update
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer Update;
      }
      ? Update
      : never
    : never;
