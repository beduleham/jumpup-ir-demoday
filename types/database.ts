// supabase/migrations의 스키마를 Supabase 생성 타입과 같은 모양으로 옮긴 것.
// Supabase CLI를 쓸 수 있게 되면 `supabase gen types typescript` 출력으로 교체한다.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      settings: {
        Row: {
          id: string;
          status: string;
          current_pitch_team_id: string | null;
          reveal_step: number;
          budget_units: number;
          max_units_per_team: number;
          require_full_spend: boolean;
          min_teams_to_invest: number;
          show_live_totals: boolean;
          updated_at: string;
        };
        Insert: {
          id?: string;
          status?: string;
          current_pitch_team_id?: string | null;
          reveal_step?: number;
          budget_units?: number;
          max_units_per_team?: number;
          require_full_spend?: boolean;
          min_teams_to_invest?: number;
          show_live_totals?: boolean;
          updated_at?: string;
        };
        Update: {
          id?: string;
          status?: string;
          current_pitch_team_id?: string | null;
          reveal_step?: number;
          budget_units?: number;
          max_units_per_team?: number;
          require_full_spend?: boolean;
          min_teams_to_invest?: number;
          show_live_totals?: boolean;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "fk_settings_current_pitch_team";
            columns: ["current_pitch_team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
        ];
      };
      teams: {
        Row: {
          id: string;
          team_no: number;
          company_name: string;
          leader_name: string;
          phone: string;
          description: string;
          note: string;
          display_order: number;
          manual_rank_override: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          team_no: number;
          company_name: string;
          leader_name: string;
          phone: string;
          description?: string;
          note?: string;
          display_order?: number;
          manual_rank_override?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          team_no?: number;
          company_name?: string;
          leader_name?: string;
          phone?: string;
          description?: string;
          note?: string;
          display_order?: number;
          manual_rank_override?: number | null;
          created_at?: string;
        };
        Relationships: [];
      };
      investors: {
        Row: {
          id: string;
          investor_no: number;
          investor_name: string;
          phone: string;
          investor_type: string;
          team_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          investor_no: number;
          investor_name: string;
          phone: string;
          investor_type: string;
          team_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          investor_no?: number;
          investor_name?: string;
          phone?: string;
          investor_type?: string;
          team_id?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "investors_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
        ];
      };
      investments: {
        Row: {
          id: string;
          investor_id: string;
          team_id: string;
          amount_units: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          investor_id: string;
          team_id: string;
          amount_units: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          investor_id?: string;
          team_id?: string;
          amount_units?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "investments_investor_id_fkey";
            columns: ["investor_id"];
            isOneToOne: false;
            referencedRelation: "investors";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "investments_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
        ];
      };
      invitation_tokens: {
        Row: {
          token: string;
          investor_id: string;
          expires_at: string;
          used_at: string | null;
          created_at: string;
        };
        Insert: {
          token: string;
          investor_id: string;
          expires_at: string;
          used_at?: string | null;
          created_at?: string;
        };
        Update: {
          token?: string;
          investor_id?: string;
          expires_at?: string;
          used_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "invitation_tokens_investor_id_fkey";
            columns: ["investor_id"];
            isOneToOne: false;
            referencedRelation: "investors";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      consume_invitation_token: {
        Args: { p_token: string };
        Returns: Json;
      };
      set_investment: {
        Args: { p_investor_id: string; p_team_id: string; p_target_units: number };
        Returns: Json;
      };
      reset_investments_data: {
        Args: Record<PropertyKey, never>;
        Returns: Json;
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

type Tables = Database["public"]["Tables"];

export type SettingsRow = Tables["settings"]["Row"];
export type TeamsRow = Tables["teams"]["Row"];
export type InvestorsRow = Tables["investors"]["Row"];
export type InvestmentsRow = Tables["investments"]["Row"];

/** set_investment가 돌려주는 JSON. 금액 단위는 1억 원이다. */
export interface SetInvestmentResult {
  success: true;
  investor_id: string;
  team_id: string;
  allocated_units: number;
  total_invested_units: number;
  remaining_units: number;
}

/** reset_investments_data가 돌려주는 JSON. */
export interface ResetInvestmentsResult {
  success: true;
  message: string;
}
