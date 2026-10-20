export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: { extensions?: Json; operationName?: string; query?: string; variables?: Json };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      accounts: {
        Row: {
          created_at: string;
          currency: string;
          id: string;
          name: string;
          position: number;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          currency: string;
          id?: string;
          name: string;
          position?: number;
        };
        Update: {
          created_at?: string;
          currency?: string;
          id?: string;
          name?: string;
          position?: number;
        };
        Relationships: [];
      };
      budget_lines: {
        Row: {
          action_note: string;
          created_at: string;
          envelope_id: string;
          funding_note: string;
          id: string;
          month_start: string;
          planned_usd_cents: number;
        };
        ComputedFields: never;
        Insert: {
          action_note?: string;
          created_at?: string;
          envelope_id: string;
          funding_note?: string;
          id?: string;
          month_start: string;
          planned_usd_cents: number;
        };
        Update: {
          action_note?: string;
          created_at?: string;
          envelope_id?: string;
          funding_note?: string;
          id?: string;
          month_start?: string;
          planned_usd_cents?: number;
        };
        Relationships: [
          {
            foreignKeyName: "budget_lines_envelope_id_fkey";
            columns: ["envelope_id"];
            isOneToOne: false;
            referencedRelation: "envelopes";
            referencedColumns: ["id"];
          },
        ];
      };
      debts: {
        Row: {
          amount_cents: number;
          created_at: string;
          currency: string;
          description: string;
          direction: string;
          due_on: string | null;
          id: string;
          is_paid: boolean;
          position: number;
        };
        ComputedFields: never;
        Insert: {
          amount_cents: number;
          created_at?: string;
          currency: string;
          description: string;
          direction: string;
          due_on?: string | null;
          id?: string;
          is_paid?: boolean;
          position?: number;
        };
        Update: {
          amount_cents?: number;
          created_at?: string;
          currency?: string;
          description?: string;
          direction?: string;
          due_on?: string | null;
          id?: string;
          is_paid?: boolean;
          position?: number;
        };
        Relationships: [];
      };
      entries: {
        Row: {
          account_id: string;
          amount_cents: number;
          description: string;
          envelope_id: string;
          id: string;
          is_fee: boolean;
          operation_id: string;
          position: number;
          usd_value_cents: number | null;
        };
        ComputedFields: never;
        Insert: {
          account_id: string;
          amount_cents: number;
          description?: string;
          envelope_id: string;
          id?: string;
          is_fee?: boolean;
          operation_id: string;
          position?: number;
          usd_value_cents?: number | null;
        };
        Update: {
          account_id?: string;
          amount_cents?: number;
          description?: string;
          envelope_id?: string;
          id?: string;
          is_fee?: boolean;
          operation_id?: string;
          position?: number;
          usd_value_cents?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "entries_account_id_fkey";
            columns: ["account_id"];
            isOneToOne: false;
            referencedRelation: "accounts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "entries_envelope_id_fkey";
            columns: ["envelope_id"];
            isOneToOne: false;
            referencedRelation: "envelopes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "entries_operation_id_fkey";
            columns: ["operation_id"];
            isOneToOne: false;
            referencedRelation: "expected_income_summary";
            referencedColumns: ["operation_id"];
          },
          {
            foreignKeyName: "entries_operation_id_fkey";
            columns: ["operation_id"];
            isOneToOne: false;
            referencedRelation: "operations";
            referencedColumns: ["id"];
          },
        ];
      };
      envelopes: {
        Row: {
          created_at: string;
          emoji: string | null;
          id: string;
          is_third_party: boolean;
          name: string;
          position: number;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          emoji?: string | null;
          id?: string;
          is_third_party?: boolean;
          name: string;
          position?: number;
        };
        Update: {
          created_at?: string;
          emoji?: string | null;
          id?: string;
          is_third_party?: boolean;
          name?: string;
          position?: number;
        };
        Relationships: [];
      };
      expected_incomes: {
        Row: {
          created_at: string;
          emoji: string | null;
          expected_usd_cents: number;
          id: string;
          month_start: string;
          name: string;
          position: number;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          emoji?: string | null;
          expected_usd_cents: number;
          id?: string;
          month_start: string;
          name: string;
          position?: number;
        };
        Update: {
          created_at?: string;
          emoji?: string | null;
          expected_usd_cents?: number;
          id?: string;
          month_start?: string;
          name?: string;
          position?: number;
        };
        Relationships: [];
      };
      household_members: {
        Row: {
          created_at: string;
          display_name: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          display_name: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          display_name?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      operations: {
        Row: {
          adjustment_reason: string | null;
          created_at: string;
          created_by: string | null;
          date_approximate: boolean;
          description: string;
          id: string;
          income_id: string | null;
          kind: string;
          occurred_on: string;
        };
        ComputedFields: never;
        Insert: {
          adjustment_reason?: string | null;
          created_at?: string;
          created_by?: string | null;
          date_approximate?: boolean;
          description?: string;
          id?: string;
          income_id?: string | null;
          kind: string;
          occurred_on: string;
        };
        Update: {
          adjustment_reason?: string | null;
          created_at?: string;
          created_by?: string | null;
          date_approximate?: boolean;
          description?: string;
          id?: string;
          income_id?: string | null;
          kind?: string;
          occurred_on?: string;
        };
        Relationships: [
          {
            foreignKeyName: "operations_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "household_members";
            referencedColumns: ["user_id"];
          },
          {
            foreignKeyName: "operations_income_id_fkey";
            columns: ["income_id"];
            isOneToOne: false;
            referencedRelation: "expected_income_summary";
            referencedColumns: ["expected_income_id"];
          },
          {
            foreignKeyName: "operations_income_id_fkey";
            columns: ["income_id"];
            isOneToOne: false;
            referencedRelation: "expected_incomes";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      account_ledger: {
        Row: {
          account_id: string | null;
          amount_cents: number | null;
          currency: string | null;
          date_approximate: boolean | null;
          description: string | null;
          entry_id: string | null;
          envelope_id: string | null;
          is_fee: boolean | null;
          kind: string | null;
          occurred_on: string | null;
          operation_description: string | null;
          operation_id: string | null;
          position: number | null;
          running_balance_cents: number | null;
        };
        ComputedFields: never;
        Relationships: [
          {
            foreignKeyName: "entries_account_id_fkey";
            columns: ["account_id"];
            isOneToOne: false;
            referencedRelation: "accounts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "entries_envelope_id_fkey";
            columns: ["envelope_id"];
            isOneToOne: false;
            referencedRelation: "envelopes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "entries_operation_id_fkey";
            columns: ["operation_id"];
            isOneToOne: false;
            referencedRelation: "expected_income_summary";
            referencedColumns: ["operation_id"];
          },
          {
            foreignKeyName: "entries_operation_id_fkey";
            columns: ["operation_id"];
            isOneToOne: false;
            referencedRelation: "operations";
            referencedColumns: ["id"];
          },
        ];
      };
      budget_checks: {
        Row: {
          allocated_ves_cents: number | null;
          expected_usd_cents: number | null;
          month_start: string | null;
          planned_usd_cents: number | null;
          received_ves_cents: number | null;
        };
        ComputedFields: never;
        Relationships: [];
      };
      budget_summary: {
        Row: {
          action_note: string | null;
          allocated_usd_cents: number | null;
          allocated_ves_cents: number | null;
          budget_line_id: string | null;
          envelope_id: string | null;
          funding_note: string | null;
          is_delivered: boolean | null;
          month_start: string | null;
          planned_usd_cents: number | null;
        };
        ComputedFields: never;
        Relationships: [
          {
            foreignKeyName: "budget_lines_envelope_id_fkey";
            columns: ["envelope_id"];
            isOneToOne: false;
            referencedRelation: "envelopes";
            referencedColumns: ["id"];
          },
        ];
      };
      debt_totals: {
        Row: {
          currency: string | null;
          direction: string | null;
          total_cents: number | null;
        };
        ComputedFields: never;
        Relationships: [];
      };
      envelope_allocations: {
        Row: {
          allocated_usd_cents: number | null;
          allocated_ves_cents: number | null;
          envelope_id: string | null;
          month_start: string | null;
        };
        ComputedFields: never;
        Relationships: [
          {
            foreignKeyName: "entries_envelope_id_fkey";
            columns: ["envelope_id"];
            isOneToOne: false;
            referencedRelation: "envelopes";
            referencedColumns: ["id"];
          },
        ];
      };
      envelope_ledger: {
        Row: {
          account_id: string | null;
          amount_cents: number | null;
          currency: string | null;
          date_approximate: boolean | null;
          description: string | null;
          entry_id: string | null;
          envelope_id: string | null;
          is_fee: boolean | null;
          kind: string | null;
          occurred_on: string | null;
          operation_description: string | null;
          operation_id: string | null;
          position: number | null;
          running_balance_cents: number | null;
        };
        ComputedFields: never;
        Relationships: [
          {
            foreignKeyName: "entries_account_id_fkey";
            columns: ["account_id"];
            isOneToOne: false;
            referencedRelation: "accounts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "entries_envelope_id_fkey";
            columns: ["envelope_id"];
            isOneToOne: false;
            referencedRelation: "envelopes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "entries_operation_id_fkey";
            columns: ["operation_id"];
            isOneToOne: false;
            referencedRelation: "expected_income_summary";
            referencedColumns: ["operation_id"];
          },
          {
            foreignKeyName: "entries_operation_id_fkey";
            columns: ["operation_id"];
            isOneToOne: false;
            referencedRelation: "operations";
            referencedColumns: ["id"];
          },
        ];
      };
      expected_income_summary: {
        Row: {
          account_id: string | null;
          currency: string | null;
          emoji: string | null;
          expected_income_id: string | null;
          expected_usd_cents: number | null;
          is_received: boolean | null;
          month_start: string | null;
          name: string | null;
          operation_id: string | null;
          position: number | null;
          received_cents: number | null;
          received_on: string | null;
          received_usd_cents: number | null;
        };
        ComputedFields: never;
        Relationships: [
          {
            foreignKeyName: "entries_account_id_fkey";
            columns: ["account_id"];
            isOneToOne: false;
            referencedRelation: "accounts";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Functions: {
      account_balances: {
        Args: { as_of?: string };
        Returns: {
          account_id: string;
          balance_cents: number;
          currency: string;
          name: string;
          position: number;
          third_party_cents: number;
        }[];
      };
      assert_operation_shape: { Args: { target: string }; Returns: undefined };
      assert_receipt_shape: { Args: { target: string }; Returns: undefined };
      cell_balances: {
        Args: { as_of?: string };
        Returns: {
          account_id: string;
          balance_cents: number;
          currency: string;
          envelope_id: string;
        }[];
      };
      currency_totals: {
        Args: { as_of?: string };
        Returns: {
          currency: string;
          own_cents: number;
          third_party_cents: number;
          total_cents: number;
        }[];
      };
      envelope_balances: {
        Args: { as_of?: string };
        Returns: {
          balance_cents: number;
          currency: string;
          envelope_id: string;
        }[];
      };
      is_household_member: { Args: Record<PropertyKey, never>; Returns: boolean };
      reset_imported_data: { Args: { include_app_data?: boolean }; Returns: undefined };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const;
