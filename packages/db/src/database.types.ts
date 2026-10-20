
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "friend_codes": {
                  Row: {
                    "code": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "code": string,"user_id": string
                  }
                  Update: {
                    "code"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "friend_codes_user_id_fkey"
      columns: ["user_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"friendships": {
                  Row: {
                    "accepted_at": string | null,"addressee_id": string,"created_at": string,"id": string,"requester_id": string,"status": Database["public"]['Enums']["friendship_status"]
                  }
                  ComputedFields: never
                  Insert: {
                    "accepted_at"?: string | null,"addressee_id": string,"created_at"?: string,"id"?: string,"requester_id": string,"status"?: Database["public"]['Enums']["friendship_status"]
                  }
                  Update: {
                    "accepted_at"?: string | null,"addressee_id"?: string,"created_at"?: string,"id"?: string,"requester_id"?: string,"status"?: Database["public"]['Enums']["friendship_status"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "friendships_addressee_id_fkey"
      columns: ["addressee_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "friendships_requester_id_fkey"
      columns: ["requester_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"game_runs": {
                  Row: {
                    "finished_at": string | null,"game": string,"id": string,"max_tile": number | null,"moves": string | null,"rejection_reason": string | null,"score": number | null,"seed": number,"started_at": string,"status": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "finished_at"?: string | null,"game": string,"id"?: string,"max_tile"?: number | null,"moves"?: string | null,"rejection_reason"?: string | null,"score"?: number | null,"seed": number,"started_at"?: string,"status"?: string,"user_id": string
                  }
                  Update: {
                    "finished_at"?: string | null,"game"?: string,"id"?: string,"max_tile"?: number | null,"moves"?: string | null,"rejection_reason"?: string | null,"score"?: number | null,"seed"?: number,"started_at"?: string,"status"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "game_runs_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"matches": {
                  Row: {
                    "created_at": string,"created_by": string,"end_reason": string | null,"game": string,"id": string,"moves": (number)[],"player_o": string,"player_x": string,"status": string,"updated_at": string,"winner": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by": string,"end_reason"?: string | null,"game": string,"id"?: string,"moves"?: (number)[],"player_o": string,"player_x": string,"status"?: string,"updated_at"?: string,"winner"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string,"end_reason"?: string | null,"game"?: string,"id"?: string,"moves"?: (number)[],"player_o"?: string,"player_x"?: string,"status"?: string,"updated_at"?: string,"winner"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "matches_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "matches_player_o_fkey"
      columns: ["player_o"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "matches_player_x_fkey"
      columns: ["player_x"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "avatar_parts": NonNullable<Json>,"avatar_seed": number,"created_at": string,"id": string,"supporter_since": string | null,"supporter_tier": string | null,"username": string,"xp": number
                  }
                  ComputedFields: never
                  Insert: {
                    "avatar_parts"?: NonNullable<Json>,"avatar_seed": number,"created_at"?: string,"id": string,"supporter_since"?: string | null,"supporter_tier"?: string | null,"username": string,"xp"?: number
                  }
                  Update: {
                    "avatar_parts"?: NonNullable<Json>,"avatar_seed"?: number,"created_at"?: string,"id"?: string,"supporter_since"?: string | null,"supporter_tier"?: string | null,"username"?: string,"xp"?: number
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "apply_match_move":
{ Args: { "end_reason"?: string,"match_id": string,"moves": (number)[],"previous_count": number,"winner"?: string }; Returns: undefined
                           },
"cancel_match":
{ Args: { "match_id": string }; Returns: undefined
                           },
"create_match":
{ Args: { "game": string,"opponent": string }; Returns: string
                           },
"finish_run":
{ Args: { "max_tile": number,"moves": string,"run_id": string,"score": number }; Returns: undefined
                           },
"get_leaderboard":
{ Args: { "game": string,"max_rows"?: number,"period"?: string,"scope"?: string }; Returns: {
              "achieved_at": string,"avatar_parts": Json,"avatar_seed": number,"rank": number,"score": number,"supporter_tier": string,"user_id": string,"username": string
            }[]
                           },
"get_my_standing":
{ Args: { "game": string }; Returns: {
              "best_score": number,"friends_players": number,"friends_rank": number,"global_players": number,"global_rank": number
            }[]
                           },
"get_pending_counts":
{ Args: Record<PropertyKey, never>; Returns: {
              "friend_requests": number,"match_invites": number,"my_turn": number
            }[]
                           },
"reject_run":
{ Args: { "reason": string,"run_id": string }; Returns: undefined
                           },
"remove_friend":
{ Args: { "friend_id": string }; Returns: undefined
                           },
"resign_match":
{ Args: { "match_id": string }; Returns: undefined
                           },
"respond_friend_request":
{ Args: { "accept": boolean,"request_id": string }; Returns: undefined
                           },
"respond_match":
{ Args: { "accept": boolean,"match_id": string }; Returns: undefined
                           },
"send_friend_request":
{ Args: { "friend_code": string }; Returns: string
                           },
"start_run":
{ Args: { "game": string }; Returns: {
              "id": string,"seed": number
            }[]
                           }
          }
          Enums: {
            "friendship_status": "pending"|"accepted"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "friendship_status": ["pending", "accepted"]
          }
        }
} as const
