export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ad_campaign_events: {
        Row: {
          api_key_id: string | null
          campaign_id: string
          created_at: string | null
          event_type: string
          id: string
          ip_address: string | null
          metadata: Json | null
          user_agent: string | null
        }
        Insert: {
          api_key_id?: string | null
          campaign_id: string
          created_at?: string | null
          event_type: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_agent?: string | null
        }
        Update: {
          api_key_id?: string | null
          campaign_id?: string
          created_at?: string | null
          event_type?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ad_campaign_events_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "app_api_keys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_campaign_events_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "ad_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_campaigns: {
        Row: {
          ad_type: string
          app_id: string | null
          clicks_count: number | null
          created_at: string | null
          daily_budget: number | null
          description: string | null
          destination_url: string
          duration_days: number
          id: string
          impressions_count: number | null
          media_type: string
          media_url: string
          name: string
          reward_amount: number | null
          rewards_count: number | null
          skip_after_seconds: number | null
          status: string
          title: string | null
          total_budget: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          ad_type: string
          app_id?: string | null
          clicks_count?: number | null
          created_at?: string | null
          daily_budget?: number | null
          description?: string | null
          destination_url: string
          duration_days?: number
          id?: string
          impressions_count?: number | null
          media_type?: string
          media_url: string
          name: string
          reward_amount?: number | null
          rewards_count?: number | null
          skip_after_seconds?: number | null
          status?: string
          title?: string | null
          total_budget?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          ad_type?: string
          app_id?: string | null
          clicks_count?: number | null
          created_at?: string | null
          daily_budget?: number | null
          description?: string | null
          destination_url?: string
          duration_days?: number
          id?: string
          impressions_count?: number | null
          media_type?: string
          media_url?: string
          name?: string
          reward_amount?: number | null
          rewards_count?: number | null
          skip_after_seconds?: number | null
          status?: string
          title?: string | null
          total_budget?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_campaigns_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "apps"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_events: {
        Row: {
          ad_id: string
          created_at: string
          event_type: string
          id: string
          source: string | null
        }
        Insert: {
          ad_id: string
          created_at?: string
          event_type: string
          id?: string
          source?: string | null
        }
        Update: {
          ad_id?: string
          created_at?: string
          event_type?: string
          id?: string
          source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ad_events_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "app_ads"
            referencedColumns: ["id"]
          },
        ]
      }
      app_ads: {
        Row: {
          app_id: string
          clicks_count: number | null
          created_at: string
          description: string | null
          duration_seconds: number | null
          id: string
          impressions_count: number | null
          is_active: boolean
          skip_after_seconds: number
          title: string | null
          updated_at: string
          user_id: string
          video_url: string
        }
        Insert: {
          app_id: string
          clicks_count?: number | null
          created_at?: string
          description?: string | null
          duration_seconds?: number | null
          id?: string
          impressions_count?: number | null
          is_active?: boolean
          skip_after_seconds?: number
          title?: string | null
          updated_at?: string
          user_id: string
          video_url: string
        }
        Update: {
          app_id?: string
          clicks_count?: number | null
          created_at?: string
          description?: string | null
          duration_seconds?: number | null
          id?: string
          impressions_count?: number | null
          is_active?: boolean
          skip_after_seconds?: number
          title?: string | null
          updated_at?: string
          user_id?: string
          video_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_ads_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "apps"
            referencedColumns: ["id"]
          },
        ]
      }
      app_api_keys: {
        Row: {
          api_key: string
          app_name: string
          created_at: string | null
          id: string
          is_active: boolean | null
          last_used_at: string | null
          user_id: string
        }
        Insert: {
          api_key?: string
          app_name: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_used_at?: string | null
          user_id: string
        }
        Update: {
          api_key?: string
          app_name?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_used_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      app_bookmarks: {
        Row: {
          app_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          app_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          app_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_bookmarks_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "apps"
            referencedColumns: ["id"]
          },
        ]
      }
      app_downloads: {
        Row: {
          app_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          app_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          app_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_downloads_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "apps"
            referencedColumns: ["id"]
          },
        ]
      }
      app_drafts: {
        Row: {
          ad_title: string | null
          age_rating: string | null
          category_id: string | null
          created_at: string
          description: string | null
          developer_name: string | null
          developer_website_url: string | null
          id: string
          languages: string[] | null
          launch_at: string | null
          logo_url: string | null
          name: string
          network_type: string
          notes: string | null
          payment_id: string | null
          payment_status: string
          payment_type: string | null
          price_amount: number | null
          pricing_model: string
          privacy_policy_url: string | null
          screenshot_urls: string[] | null
          tagline: string | null
          tags: string[] | null
          terms_of_service_url: string | null
          updated_at: string
          user_id: string
          version: string | null
          video_ad_url: string | null
          website_url: string
          whats_new: string | null
        }
        Insert: {
          ad_title?: string | null
          age_rating?: string | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          developer_name?: string | null
          developer_website_url?: string | null
          id?: string
          languages?: string[] | null
          launch_at?: string | null
          logo_url?: string | null
          name: string
          network_type?: string
          notes?: string | null
          payment_id?: string | null
          payment_status?: string
          payment_type?: string | null
          price_amount?: number | null
          pricing_model?: string
          privacy_policy_url?: string | null
          screenshot_urls?: string[] | null
          tagline?: string | null
          tags?: string[] | null
          terms_of_service_url?: string | null
          updated_at?: string
          user_id: string
          version?: string | null
          video_ad_url?: string | null
          website_url: string
          whats_new?: string | null
        }
        Update: {
          ad_title?: string | null
          age_rating?: string | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          developer_name?: string | null
          developer_website_url?: string | null
          id?: string
          languages?: string[] | null
          launch_at?: string | null
          logo_url?: string | null
          name?: string
          network_type?: string
          notes?: string | null
          payment_id?: string | null
          payment_status?: string
          payment_type?: string | null
          price_amount?: number | null
          pricing_model?: string
          privacy_policy_url?: string | null
          screenshot_urls?: string[] | null
          tagline?: string | null
          tags?: string[] | null
          terms_of_service_url?: string | null
          updated_at?: string
          user_id?: string
          version?: string | null
          video_ad_url?: string | null
          website_url?: string
          whats_new?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "app_drafts_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      app_feedback: {
        Row: {
          app_id: string
          created_at: string
          feedback_text: string
          id: string
          user_id: string
        }
        Insert: {
          app_id: string
          created_at?: string
          feedback_text: string
          id?: string
          user_id: string
        }
        Update: {
          app_id?: string
          created_at?: string
          feedback_text?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_feedback_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "apps"
            referencedColumns: ["id"]
          },
        ]
      }
      app_purchases: {
        Row: {
          app_id: string
          created_at: string
          expires_at: string | null
          id: string
          last_payment_id: string | null
          paid_at: string
          purchase_type: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          app_id: string
          created_at?: string
          expires_at?: string | null
          id?: string
          last_payment_id?: string | null
          paid_at?: string
          purchase_type: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          app_id?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          last_payment_id?: string | null
          paid_at?: string
          purchase_type?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_purchases_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "apps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "app_purchases_last_payment_id_fkey"
            columns: ["last_payment_id"]
            isOneToOne: false
            referencedRelation: "pi_payments"
            referencedColumns: ["id"]
          },
        ]
      }
      app_reviews: {
        Row: {
          app_id: string
          created_at: string
          id: string
          rating: number
          review_text: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          app_id: string
          created_at?: string
          id?: string
          rating: number
          review_text?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          app_id?: string
          created_at?: string
          id?: string
          rating?: number
          review_text?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_reviews_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "apps"
            referencedColumns: ["id"]
          },
        ]
      }
      app_screenshots: {
        Row: {
          app_id: string
          created_at: string
          display_order: number | null
          id: string
          image_url: string
        }
        Insert: {
          app_id: string
          created_at?: string
          display_order?: number | null
          id?: string
          image_url: string
        }
        Update: {
          app_id?: string
          created_at?: string
          display_order?: number | null
          id?: string
          image_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_screenshots_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "apps"
            referencedColumns: ["id"]
          },
        ]
      }
      app_views: {
        Row: {
          app_id: string
          created_at: string
          id: string
          user_id: string | null
        }
        Insert: {
          app_id: string
          created_at?: string
          id?: string
          user_id?: string | null
        }
        Update: {
          app_id?: string
          created_at?: string
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "app_views_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "apps"
            referencedColumns: ["id"]
          },
        ]
      }
      apps: {
        Row: {
          age_rating: string | null
          average_rating: number | null
          category_id: string | null
          compatibility: string | null
          created_at: string
          description: string | null
          developer_name: string | null
          developer_website_url: string | null
          has_in_app_purchases: boolean | null
          id: string
          is_featured: boolean | null
          is_popular: boolean | null
          is_verified: boolean
          languages: string[] | null
          launch_at: string | null
          logo_url: string | null
          name: string
          network_type: string
          notes: string | null
          payment_type: string | null
          price_amount: number | null
          pricing_model: string
          privacy_policy_url: string | null
          ratings_count: number | null
          status: string | null
          tagline: string | null
          tags: string[] | null
          terms_of_service_url: string | null
          updated_at: string
          user_id: string | null
          verified_until: string | null
          version: string | null
          views_count: number | null
          website_url: string
          whats_new: string | null
        }
        Insert: {
          age_rating?: string | null
          average_rating?: number | null
          category_id?: string | null
          compatibility?: string | null
          created_at?: string
          description?: string | null
          developer_name?: string | null
          developer_website_url?: string | null
          has_in_app_purchases?: boolean | null
          id?: string
          is_featured?: boolean | null
          is_popular?: boolean | null
          is_verified?: boolean
          languages?: string[] | null
          launch_at?: string | null
          logo_url?: string | null
          name: string
          network_type?: string
          notes?: string | null
          payment_type?: string | null
          price_amount?: number | null
          pricing_model?: string
          privacy_policy_url?: string | null
          ratings_count?: number | null
          status?: string | null
          tagline?: string | null
          tags?: string[] | null
          terms_of_service_url?: string | null
          updated_at?: string
          user_id?: string | null
          verified_until?: string | null
          version?: string | null
          views_count?: number | null
          website_url: string
          whats_new?: string | null
        }
        Update: {
          age_rating?: string | null
          average_rating?: number | null
          category_id?: string | null
          compatibility?: string | null
          created_at?: string
          description?: string | null
          developer_name?: string | null
          developer_website_url?: string | null
          has_in_app_purchases?: boolean | null
          id?: string
          is_featured?: boolean | null
          is_popular?: boolean | null
          is_verified?: boolean
          languages?: string[] | null
          launch_at?: string | null
          logo_url?: string | null
          name?: string
          network_type?: string
          notes?: string | null
          payment_type?: string | null
          price_amount?: number | null
          pricing_model?: string
          privacy_policy_url?: string | null
          ratings_count?: number | null
          status?: string | null
          tagline?: string | null
          tags?: string[] | null
          terms_of_service_url?: string | null
          updated_at?: string
          user_id?: string | null
          verified_until?: string | null
          version?: string | null
          views_count?: number | null
          website_url?: string
          whats_new?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "apps_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_posts: {
        Row: {
          app_id: string | null
          author_id: string
          content: string
          cover_image_url: string | null
          created_at: string
          id: string
          is_published: boolean
          published_at: string | null
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          app_id?: string | null
          author_id: string
          content?: string
          cover_image_url?: string | null
          created_at?: string
          id?: string
          is_published?: boolean
          published_at?: string | null
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          app_id?: string | null
          author_id?: string
          content?: string
          cover_image_url?: string | null
          created_at?: string
          id?: string
          is_published?: boolean
          published_at?: string | null
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_posts_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "apps"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          icon: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      developer_earnings: {
        Row: {
          app_id: string
          created_at: string
          developer_id: string
          developer_share: number
          id: string
          payment_id: string | null
          platform_fee: number
          total_amount: number
        }
        Insert: {
          app_id: string
          created_at?: string
          developer_id: string
          developer_share?: number
          id?: string
          payment_id?: string | null
          platform_fee?: number
          total_amount?: number
        }
        Update: {
          app_id?: string
          created_at?: string
          developer_id?: string
          developer_share?: number
          id?: string
          payment_id?: string | null
          platform_fee?: number
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "developer_earnings_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "apps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "developer_earnings_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "pi_payments"
            referencedColumns: ["id"]
          },
        ]
      }
      pi_payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          memo: string | null
          metadata: Json | null
          payment_id: string
          status: string
          txid: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          memo?: string | null
          metadata?: Json | null
          payment_id: string
          status?: string
          txid?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          memo?: string | null
          metadata?: Json | null
          payment_id?: string
          status?: string
          txid?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          id: string
          is_admin: boolean | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id: string
          is_admin?: boolean | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          is_admin?: boolean | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      withdrawal_requests: {
        Row: {
          amount: number
          created_at: string
          developer_id: string
          id: string
          pi_uid: string | null
          pi_wallet_address: string | null
          processed_at: string | null
          status: string
          txid: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          developer_id: string
          id?: string
          pi_uid?: string | null
          pi_wallet_address?: string | null
          processed_at?: string | null
          status?: string
          txid?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          developer_id?: string
          id?: string
          pi_uid?: string | null
          pi_wallet_address?: string | null
          processed_at?: string | null
          status?: string
          txid?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_category:
        | "productivity"
        | "utilities"
        | "entertainment"
        | "social"
        | "education"
        | "finance"
        | "health"
        | "lifestyle"
        | "business"
        | "developer"
        | "games"
        | "other"
      app_role: "admin" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_category: [
        "productivity",
        "utilities",
        "entertainment",
        "social",
        "education",
        "finance",
        "health",
        "lifestyle",
        "business",
        "developer",
        "games",
        "other",
      ],
      app_role: ["admin", "user"],
    },
  },
} as const
