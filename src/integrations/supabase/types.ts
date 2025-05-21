export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      bank_accounts: {
        Row: {
          account_number: string;
          amount: number;
          bank: string;
          currency: string;
          id: string;
        };
        Insert: {
          account_number: string;
          amount: number;
          bank: string;
          currency: string;
          id: string;
        };
        Update: {
          account_number?: string;
          amount?: number;
          bank?: string;
          currency?: string;
          id?: string;
        };
        Relationships: [];
      };
      calendar_events: {
        Row: {
          category: string | null;
          client_id: string | null;
          completed: boolean;
          created_at: string;
          description: string | null;
          end_date: string;
          id: string;
          is_reminder: boolean;
          location: string | null;
          location_url: string | null;
          reminder_days: number | null;
          start_date: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          category?: string | null;
          client_id?: string | null;
          completed: boolean;
          created_at: string;
          description?: string | null;
          end_date: string;
          id: string;
          is_reminder: boolean;
          location?: string | null;
          location_url?: string | null;
          reminder_days?: number | null;
          start_date: string;
          title: string;
          updated_at: string;
        };
        Update: {
          category?: string | null;
          client_id?: string | null;
          completed?: boolean;
          created_at?: string;
          description?: string | null;
          end_date?: string;
          id?: string;
          is_reminder?: boolean;
          location?: string | null;
          location_url?: string | null;
          reminder_days?: number | null;
          start_date?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "calendar_events_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          }
        ];
      };
      clients: {
        Row: {
          active: boolean;
          address: string | null;
          alert_note: string | null;
          alert_status: string | null;
          category: string | null;
          client_type: string | null;
          contact_person: string | null;
          created_at: string;
          email: string | null;
          id: string;
          identification_file_url: string | null;
          identification_number: string | null;
          identification_type: string | null;
          name: string;
          phone: string | null;
          related_to_client_id: string | null;
          updated_at: string;
        };
        Insert: {
          active: boolean;
          address?: string | null;
          alert_note?: string | null;
          alert_status?: string | null;
          category?: string | null;
          client_type?: string | null;
          contact_person?: string | null;
          created_at: string;
          email?: string | null;
          id: string;
          identification_file_url?: string | null;
          identification_number?: string | null;
          identification_type?: string | null;
          name: string;
          phone?: string | null;
          related_to_client_id?: string | null;
          updated_at: string;
        };
        Update: {
          active?: boolean;
          address?: string | null;
          alert_note?: string | null;
          alert_status?: string | null;
          category?: string | null;
          client_type?: string | null;
          contact_person?: string | null;
          created_at?: string;
          email?: string | null;
          id?: string;
          identification_file_url?: string | null;
          identification_number?: string | null;
          identification_type?: string | null;
          name?: string;
          phone?: string | null;
          related_to_client_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "clients_related_to_client_id_fkey";
            columns: ["related_to_client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          }
        ];
      };
      debts: {
        Row: {
          amount: number;
          category: string | null;
          client_id: string | null;
          commission: number | null;
          creditor: string;
          currency: string | null;
          due_date: string;
          id: string;
          interest_rate: number | null;
          notes: string | null;
          status: string | null;
        };
        Insert: {
          amount: number;
          category?: string | null;
          client_id?: string | null;
          commission?: number | null;
          creditor: string;
          currency?: string | null;
          due_date: string;
          id: string;
          interest_rate?: number | null;
          notes?: string | null;
          status?: string | null;
        };
        Update: {
          amount?: number;
          category?: string | null;
          client_id?: string | null;
          commission?: number | null;
          creditor?: string;
          currency?: string | null;
          due_date?: string;
          id?: string;
          interest_rate?: number | null;
          notes?: string | null;
          status?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "debts_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          }
        ];
      };
      debts_audit: {
        Row: {
          action: string | null;
          amount: number | null;
          audit_id: number;
          category: string | null;
          changed_at: string;
          changed_by: string | null;
          client_id: string | null;
          commission: number | null;
          creditor: string | null;
          currency: string | null;
          debt_id: string | null;
          due_date: string | null;
          interest_rate: number | null;
          notes: string | null;
          status: string | null;
        };
        Insert: {
          action?: string | null;
          amount?: number | null;
          audit_id?: number;
          category?: string | null;
          changed_at?: string;
          changed_by?: string | null;
          client_id?: string | null;
          commission?: number | null;
          creditor?: string | null;
          currency?: string | null;
          debt_id?: string | null;
          due_date?: string | null;
          interest_rate?: number | null;
          notes?: string | null;
          status?: string | null;
        };
        Update: {
          action?: string | null;
          amount?: number | null;
          audit_id?: number;
          category?: string | null;
          changed_at?: string;
          changed_by?: string | null;
          client_id?: string | null;
          commission?: number | null;
          creditor?: string | null;
          currency?: string | null;
          debt_id?: string | null;
          due_date?: string | null;
          interest_rate?: number | null;
          notes?: string | null;
          status?: string | null;
        };
        Relationships: [];
      };
      documents: {
        Row: {
          client_id: string;
          id: string;
          name: string;
          size: number | null;
          type: string;
          uploaded_at: string;
          url: string;
        };
        Insert: {
          client_id: string;
          id: string;
          name: string;
          size?: number | null;
          type: string;
          uploaded_at: string;
          url: string;
        };
        Update: {
          client_id?: string;
          id?: string;
          name?: string;
          size?: number | null;
          type?: string;
          uploaded_at?: string;
          url?: string;
        };
        Relationships: [
          {
            foreignKeyName: "documents_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          }
        ];
      };
      exchange_rates: {
        Row: {
          date: string;
          from_currency: string;
          id: number;
          rate: number;
          to_currency: string;
        };
        Insert: {
          date: string;
          from_currency: string;
          id?: number;
          rate: number;
          to_currency: string;
        };
        Update: {
          date?: string;
          from_currency?: string;
          id?: number;
          rate?: number;
          to_currency?: string;
        };
        Relationships: [];
      };
      expense_stats: {
        Row: {
          amount: number;
          category: string;
          color: string;
          id: number;
          percentage: number;
        };
        Insert: {
          amount: number;
          category: string;
          color: string;
          id?: number;
          percentage: number;
        };
        Update: {
          amount?: number;
          category?: string;
          color?: string;
          id?: number;
          percentage?: number;
        };
        Relationships: [];
      };
      financial_stats: {
        Row: {
          date: string;
          debts: number;
          expenses: number;
          id: number;
          net_worth: number;
          receivables: number;
        };
        Insert: {
          date: string;
          debts: number;
          expenses: number;
          id?: number;
          net_worth: number;
          receivables: number;
        };
        Update: {
          date?: string;
          debts?: number;
          expenses?: number;
          id?: number;
          net_worth?: number;
          receivables?: number;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          client_id: string | null;
          created_at: string;
          id: number;
          message: string | null;
          read: boolean | null;
          title: string | null;
          type: string | null;
          user_id: string | null;
        };
        Insert: {
          client_id?: string | null;
          created_at?: string;
          id?: number;
          message?: string | null;
          read?: boolean | null;
          title?: string | null;
          type?: string | null;
          user_id?: string | null;
        };
        Update: {
          client_id?: string | null;
          created_at?: string;
          id?: number;
          message?: string | null;
          read?: boolean | null;
          title?: string | null;
          type?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notifications_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      notifications_audit: {
        Row: {
          action: string | null;
          audit_id: number;
          changed_at: string;
          changed_by: string | null;
          client_id: string | null;
          created_at: string | null;
          message: string | null;
          notification_id: number | null;
          read: boolean | null;
          title: string | null;
          type: string | null;
          user_id: string | null;
        };
        Insert: {
          action?: string | null;
          audit_id?: number;
          changed_at?: string;
          changed_by?: string | null;
          client_id?: string | null;
          created_at?: string | null;
          message?: string | null;
          notification_id?: number | null;
          read?: boolean | null;
          title?: string | null;
          type?: string | null;
          user_id?: string | null;
        };
        Update: {
          action?: string | null;
          audit_id?: number;
          changed_at?: string;
          changed_by?: string | null;
          client_id?: string | null;
          created_at?: string | null;
          message?: string | null;
          notification_id?: number | null;
          read?: boolean | null;
          title?: string | null;
          type?: string | null;
          user_id?: string | null;
        };
        Relationships: [];
      };
      receivables: {
        Row: {
          amount: number;
          client_id: string;
          commission: number | null;
          currency: string | null;
          description: string | null;
          due_date: string;
          id: string;
          interest_rate: number | null;
          notes: string | null;
          status: string | null;
        };
        Insert: {
          amount: number;
          client_id: string;
          commission?: number | null;
          currency?: string | null;
          description?: string | null;
          due_date: string;
          id: string;
          interest_rate?: number | null;
          notes?: string | null;
          status?: string | null;
        };
        Update: {
          amount?: number;
          client_id?: string;
          commission?: number | null;
          currency?: string | null;
          description?: string | null;
          due_date?: string;
          id?: string;
          interest_rate?: number | null;
          notes?: string | null;
          status?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "receivables_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          }
        ];
      };
      receivables_audit: {
        Row: {
          action: string | null;
          amount: number | null;
          audit_id: number;
          changed_at: string;
          changed_by: string | null;
          client_id: string | null;
          commission: number | null;
          currency: string | null;
          description: string | null;
          due_date: string | null;
          interest_rate: number | null;
          notes: string | null;
          receivable_id: string | null;
          status: string | null;
        };
        Insert: {
          action?: string | null;
          amount?: number | null;
          audit_id?: number;
          changed_at?: string;
          changed_by?: string | null;
          client_id?: string | null;
          commission?: number | null;
          currency?: string | null;
          description?: string | null;
          due_date?: string | null;
          interest_rate?: number | null;
          notes?: string | null;
          receivable_id?: string | null;
          status?: string | null;
        };
        Update: {
          action?: string | null;
          amount?: number | null;
          audit_id?: number;
          changed_at?: string;
          changed_by?: string | null;
          client_id?: string | null;
          commission?: number | null;
          currency?: string | null;
          description?: string | null;
          due_date?: string | null;
          interest_rate?: number | null;
          notes?: string | null;
          receivable_id?: string | null;
          status?: string | null;
        };
        Relationships: [];
      };
      transactions: {
        Row: {
          amount: number;
          category: string | null;
          client_id: string | null;
          created_at: string;
          currency: string | null;
          date: string;
          debt_id: string | null;
          delivery_note: string | null;
          description: string | null;
          exchange_rate_id: number | null;
          id: string;
          indirect_for_client_id: string | null;
          invoice: string | null;
          notes: string | null;
          payment_method: string | null;
          receipt: string | null;
          receivable_id: string | null;
          status: string | null;
          type: string | null;
          updated_at: string;
        };
        Insert: {
          amount: number;
          category?: string | null;
          client_id?: string | null;
          created_at: string;
          currency?: string | null;
          date: string;
          debt_id?: string | null;
          delivery_note?: string | null;
          description?: string | null;
          exchange_rate_id?: number | null;
          id: string;
          indirect_for_client_id?: string | null;
          invoice?: string | null;
          notes?: string | null;
          payment_method?: string | null;
          receipt?: string | null;
          receivable_id?: string | null;
          status?: string | null;
          type?: string | null;
          updated_at: string;
        };
        Update: {
          amount?: number;
          category?: string | null;
          client_id?: string | null;
          created_at?: string;
          currency?: string | null;
          date?: string;
          debt_id?: string | null;
          delivery_note?: string | null;
          description?: string | null;
          exchange_rate_id?: number | null;
          id?: string;
          indirect_for_client_id?: string | null;
          invoice?: string | null;
          notes?: string | null;
          payment_method?: string | null;
          receipt?: string | null;
          receivable_id?: string | null;
          status?: string | null;
          type?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "transactions_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transactions_debt_id_fkey";
            columns: ["debt_id"];
            isOneToOne: false;
            referencedRelation: "debts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transactions_exchange_rate_id_fkey";
            columns: ["exchange_rate_id"];
            isOneToOne: false;
            referencedRelation: "exchange_rates";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transactions_indirect_for_client_id_fkey";
            columns: ["indirect_for_client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transactions_receivable_id_fkey";
            columns: ["receivable_id"];
            isOneToOne: false;
            referencedRelation: "receivables";
            referencedColumns: ["id"];
          }
        ];
      };
      transactions_audit: {
        Row: {
          action: string | null;
          amount: number | null;
          audit_id: number;
          category: string | null;
          changed_at: string;
          changed_by: string | null;
          client_id: string | null;
          created_at: string | null;
          currency: string | null;
          date: string | null;
          debt_id: string | null;
          delivery_note: string | null;
          description: string | null;
          exchange_rate_id: number | null;
          indirect_for_client_id: string | null;
          invoice: string | null;
          notes: string | null;
          payment_method: string | null;
          receipt: string | null;
          receivable_id: string | null;
          status: string | null;
          transaction_id: string | null;
          type: string | null;
          updated_at: string | null;
        };
        Insert: {
          action?: string | null;
          amount?: number | null;
          audit_id?: number;
          category?: string | null;
          changed_at?: string;
          changed_by?: string | null;
          client_id?: string | null;
          created_at?: string | null;
          currency?: string | null;
          date?: string | null;
          debt_id?: string | null;
          delivery_note?: string | null;
          description?: string | null;
          exchange_rate_id?: number | null;
          indirect_for_client_id?: string | null;
          invoice?: string | null;
          notes?: string | null;
          payment_method?: string | null;
          receipt?: string | null;
          receivable_id?: string | null;
          status?: string | null;
          transaction_id?: string | null;
          type?: string | null;
          updated_at?: string | null;
        };
        Update: {
          action?: string | null;
          amount?: number | null;
          audit_id?: number;
          category?: string | null;
          changed_at?: string;
          changed_by?: string | null;
          client_id?: string | null;
          created_at?: string | null;
          currency?: string | null;
          date?: string | null;
          debt_id?: string | null;
          delivery_note?: string | null;
          description?: string | null;
          exchange_rate_id?: number | null;
          indirect_for_client_id?: string | null;
          invoice?: string | null;
          notes?: string | null;
          payment_method?: string | null;
          receipt?: string | null;
          receivable_id?: string | null;
          status?: string | null;
          transaction_id?: string | null;
          type?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      users: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          email: string;
          full_name: string | null;
          id: string;
          role: string | null;
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          email: string;
          full_name?: string | null;
          id: string;
          role?: string | null;
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          email?: string;
          full_name?: string | null;
          id?: string;
          role?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DefaultSchema = Database[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
      DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] &
      DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R;
    }
    ? R
    : never
  : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
