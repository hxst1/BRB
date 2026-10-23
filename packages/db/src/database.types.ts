
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
            "battleship_fleets": {
                  Row: {
                    "created_at": string,"match_id": string,"player_id": string,"ships": NonNullable<Json>
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"match_id": string,"player_id": string,"ships": NonNullable<Json>
                  }
                  Update: {
                    "created_at"?: string,"match_id"?: string,"player_id"?: string,"ships"?: NonNullable<Json>
                  }
                  Relationships: [
                    {
      foreignKeyName: "battleship_fleets_match_id_fkey"
      columns: ["match_id"]
isOneToOne: false
      referencedRelation: "matches"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "battleship_fleets_player_id_fkey"
      columns: ["player_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"challenges": {
                  Row: {
                    "attempt_run_id": string | null,"challenged_id": string,"challenger_id": string,"created_at": string,"declined_at": string | null,"game": string,"id": string,"source_run_id": string,"target_score": number
                  }
                  ComputedFields: never
                  Insert: {
                    "attempt_run_id"?: string | null,"challenged_id": string,"challenger_id": string,"created_at"?: string,"declined_at"?: string | null,"game": string,"id"?: string,"source_run_id": string,"target_score": number
                  }
                  Update: {
                    "attempt_run_id"?: string | null,"challenged_id"?: string,"challenger_id"?: string,"created_at"?: string,"declined_at"?: string | null,"game"?: string,"id"?: string,"source_run_id"?: string,"target_score"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "challenges_attempt_run_id_fkey"
      columns: ["attempt_run_id"]
isOneToOne: true
      referencedRelation: "game_runs"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "challenges_challenged_id_fkey"
      columns: ["challenged_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "challenges_challenger_id_fkey"
      columns: ["challenger_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "challenges_source_run_id_fkey"
      columns: ["source_run_id"]
isOneToOne: false
      referencedRelation: "game_runs"
      referencedColumns: ["id"]
    }
                  ]
                },"feedback": {
                  Row: {
                    "admin_reply": string | null,"app_version": string | null,"body": string | null,"created_at": string,"id": string,"kind": string,"path": string | null,"rating": number | null,"replied_at": string | null,"status": string,"updated_at": string,"user_agent": string | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "admin_reply"?: string | null,"app_version"?: string | null,"body"?: string | null,"created_at"?: string,"id"?: string,"kind": string,"path"?: string | null,"rating"?: number | null,"replied_at"?: string | null,"status"?: string,"updated_at"?: string,"user_agent"?: string | null,"user_id": string
                  }
                  Update: {
                    "admin_reply"?: string | null,"app_version"?: string | null,"body"?: string | null,"created_at"?: string,"id"?: string,"kind"?: string,"path"?: string | null,"rating"?: number | null,"replied_at"?: string | null,"status"?: string,"updated_at"?: string,"user_agent"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "feedback_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"friend_codes": {
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
                    "daily": string | null,"finished_at": string | null,"game": string,"id": string,"max_tile": number | null,"moves": string | null,"rejection_reason": string | null,"score": number | null,"seed": number,"started_at": string,"status": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "daily"?: string | null,"finished_at"?: string | null,"game": string,"id"?: string,"max_tile"?: number | null,"moves"?: string | null,"rejection_reason"?: string | null,"score"?: number | null,"seed": number,"started_at"?: string,"status"?: string,"user_id": string
                  }
                  Update: {
                    "daily"?: string | null,"finished_at"?: string | null,"game"?: string,"id"?: string,"max_tile"?: number | null,"moves"?: string | null,"rejection_reason"?: string | null,"score"?: number | null,"seed"?: number,"started_at"?: string,"status"?: string,"user_id"?: string
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
                },"legal_documents": {
                  Row: {
                    "body": string,"slug": string,"title": string,"updated_at": string,"version": number
                  }
                  ComputedFields: never
                  Insert: {
                    "body": string,"slug": string,"title": string,"updated_at"?: string,"version"?: number
                  }
                  Update: {
                    "body"?: string,"slug"?: string,"title"?: string,"updated_at"?: string,"version"?: number
                  }
                  Relationships: [
                    
                  ]
                },"legal_translations": {
                  Row: {
                    "body": string,"lang": string,"slug": string,"title": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "body": string,"lang": string,"slug": string,"title": string,"updated_at"?: string
                  }
                  Update: {
                    "body"?: string,"lang"?: string,"slug"?: string,"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "legal_translations_slug_fkey"
      columns: ["slug"]
isOneToOne: false
      referencedRelation: "legal_documents"
      referencedColumns: ["slug"]
    }
                  ]
                },"match_choices": {
                  Row: {
                    "choice": number,"created_at": string,"match_id": string,"player_id": string,"round": number
                  }
                  ComputedFields: never
                  Insert: {
                    "choice": number,"created_at"?: string,"match_id": string,"player_id": string,"round": number
                  }
                  Update: {
                    "choice"?: number,"created_at"?: string,"match_id"?: string,"player_id"?: string,"round"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "match_choices_match_id_fkey"
      columns: ["match_id"]
isOneToOne: false
      referencedRelation: "matches"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "match_choices_player_id_fkey"
      columns: ["player_id"]
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
                },"messages": {
                  Row: {
                    "body": string,"created_at": string,"id": string,"kind": string,"read_at": string | null,"recipient_id": string,"ref_id": string | null,"sender_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "body": string,"created_at"?: string,"id"?: string,"kind"?: string,"read_at"?: string | null,"recipient_id": string,"ref_id"?: string | null,"sender_id": string
                  }
                  Update: {
                    "body"?: string,"created_at"?: string,"id"?: string,"kind"?: string,"read_at"?: string | null,"recipient_id"?: string,"ref_id"?: string | null,"sender_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "messages_recipient_id_fkey"
      columns: ["recipient_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "messages_sender_id_fkey"
      columns: ["sender_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"pinned_games": {
                  Row: {
                    "game": string,"pinned_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "game": string,"pinned_at"?: string,"user_id": string
                  }
                  Update: {
                    "game"?: string,"pinned_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "pinned_games_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"pong_reports": {
                  Row: {
                    "created_at": string,"match_id": string,"o_score": number,"player_id": string,"x_score": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"match_id": string,"o_score": number,"player_id": string,"x_score": number
                  }
                  Update: {
                    "created_at"?: string,"match_id"?: string,"o_score"?: number,"player_id"?: string,"x_score"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "pong_reports_match_id_fkey"
      columns: ["match_id"]
isOneToOne: false
      referencedRelation: "matches"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "pong_reports_player_id_fkey"
      columns: ["player_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"presence": {
                  Row: {
                    "path": string | null,"seen_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "path"?: string | null,"seen_at"?: string,"user_id": string
                  }
                  Update: {
                    "path"?: string | null,"seen_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "presence_user_id_fkey"
      columns: ["user_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "avatar_parts": NonNullable<Json>,"avatar_seed": number,"created_at": string,"first_steps_dismissed": boolean,"id": string,"locale": string,"streak_best": number,"streak_days": number,"streak_last_day": string | null,"supporter_since": string | null,"supporter_tier": string | null,"username": string,"username_changed_at": string | null,"xp": number
                  }
                  ComputedFields: never
                  Insert: {
                    "avatar_parts"?: NonNullable<Json>,"avatar_seed": number,"created_at"?: string,"first_steps_dismissed"?: boolean,"id": string,"locale"?: string,"streak_best"?: number,"streak_days"?: number,"streak_last_day"?: string | null,"supporter_since"?: string | null,"supporter_tier"?: string | null,"username": string,"username_changed_at"?: string | null,"xp"?: number
                  }
                  Update: {
                    "avatar_parts"?: NonNullable<Json>,"avatar_seed"?: number,"created_at"?: string,"first_steps_dismissed"?: boolean,"id"?: string,"locale"?: string,"streak_best"?: number,"streak_days"?: number,"streak_last_day"?: string | null,"supporter_since"?: string | null,"supporter_tier"?: string | null,"username"?: string,"username_changed_at"?: string | null,"xp"?: number
                  }
                  Relationships: [
                    
                  ]
                },"push_subscriptions": {
                  Row: {
                    "auth": string,"created_at": string,"endpoint": string,"id": string,"p256dh": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "auth": string,"created_at"?: string,"endpoint": string,"id"?: string,"p256dh": string,"user_id": string
                  }
                  Update: {
                    "auth"?: string,"created_at"?: string,"endpoint"?: string,"id"?: string,"p256dh"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "push_subscriptions_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"seen_announcements": {
                  Row: {
                    "announcement": string,"seen_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "announcement": string,"seen_at"?: string,"user_id": string
                  }
                  Update: {
                    "announcement"?: string,"seen_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "seen_announcements_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"supporter_events": {
                  Row: {
                    "active": boolean,"created_at": string,"event": string,"id": string,"payload": NonNullable<Json>,"provider": string,"provider_ref": string,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "active": boolean,"created_at"?: string,"event": string,"id"?: string,"payload": NonNullable<Json>,"provider": string,"provider_ref": string,"user_id"?: string | null
                  }
                  Update: {
                    "active"?: boolean,"created_at"?: string,"event"?: string,"id"?: string,"payload"?: NonNullable<Json>,"provider"?: string,"provider_ref"?: string,"user_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "supporter_events_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"tron_reports": {
                  Row: {
                    "created_at": string,"match_id": string,"o_score": number,"player_id": string,"x_score": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"match_id": string,"o_score": number,"player_id": string,"x_score": number
                  }
                  Update: {
                    "created_at"?: string,"match_id"?: string,"o_score"?: number,"player_id"?: string,"x_score"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "tron_reports_match_id_fkey"
      columns: ["match_id"]
isOneToOne: false
      referencedRelation: "matches"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tron_reports_player_id_fkey"
      columns: ["player_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"user_achievements": {
                  Row: {
                    "achievement": string,"unlocked_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "achievement": string,"unlocked_at"?: string,"user_id": string
                  }
                  Update: {
                    "achievement"?: string,"unlocked_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "user_achievements_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"wordle_games": {
                  Row: {
                    "day": string,"finished_at": string | null,"guesses": (string)[],"lang": string,"patterns": (string)[],"solved": boolean,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "day": string,"finished_at"?: string | null,"guesses"?: (string)[],"lang"?: string,"patterns"?: (string)[],"solved"?: boolean,"user_id": string
                  }
                  Update: {
                    "day"?: string,"finished_at"?: string | null,"guesses"?: (string)[],"lang"?: string,"patterns"?: (string)[],"solved"?: boolean,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "wordle_games_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "abandon_run":
{ Args: { "run_id": string }; Returns: undefined
                           },
"admin_assign_supporter_event":
{ Args: { "admin_id": string,"event_id": string,"reason"?: string,"user_id": string }; Returns: undefined
                           },
"admin_attention":
{ Args: Record<PropertyKey, never>; Returns: {
              "new_errors_24h": number,"open_errors": number,"rejected_runs_24h": number,"unlinked_payments": number,"unread_feedback": number
            }[]
                           },
"admin_daily_stats":
{ Args: { "days"?: number }; Returns: {
              "active_users": number,"day": string,"matches": number,"messages": number,"new_users": number,"solo_runs": number
            }[]
                           },
"admin_games_played":
{ Args: { "days"?: number }; Returns: {
              "game": string,"kind": string,"players": number,"plays": number
            }[]
                           },
"admin_get_audit":
{ Args: { "max_rows"?: number,"target_user"?: string }; Returns: {
              "action": string,"admin_id": string,"admin_username": string,"created_at": string,"details": Json,"id": number,"reason": string,"target_ref": string,"target_user": string
            }[]
                           },
"admin_get_error_events":
{ Args: { "fingerprint": string,"max_rows"?: number }; Returns: {
              "app_version": string,"created_at": string,"friend_code": string,"id": number,"message": string,"path": string,"source": string,"stack": string,"user_agent": string,"user_id": string,"username": string
            }[]
                           },
"admin_get_error_group":
{ Args: { "fingerprint": string }; Returns: {
              "count": number,"fingerprint": string,"first_seen": string,"last_seen": string,"last_version": string,"message": string,"paths": (string)[],"source": string,"status": string,"user_agents": (string)[],"users": number
            }[]
                           },
"admin_get_github_contributions":
{ Args: { "user_id": string }; Returns: {
              "created_at": string,"github_login": string,"id": number,"kind": string,"url": string
            }[]
                           },
"admin_get_referrals":
{ Args: { "user_id": string }; Returns: {
              "avatar_parts": Json,"avatar_seed": number,"created_at": string,"direction": string,"friend_code": string,"has_played": boolean,"user_id": string,"username": string
            }[]
                           },
"admin_invalidate_run":
{ Args: { "admin_id": string,"reason": string,"run_id": string }; Returns: number
                           },
"admin_list_error_groups":
{ Args: { "max_rows"?: number,"status"?: string }; Returns: {
              "count": number,"fingerprint": string,"first_seen": string,"last_seen": string,"last_version": string,"message": string,"paths": (string)[],"source": string,"status": string,"user_agents": (string)[],"users": number
            }[]
                           },
"admin_list_users":
{ Args: { "max_rows"?: number,"search"?: string,"skip"?: number }; Returns: {
              "avatar_parts": Json,"avatar_seed": number,"created_at": string,"friend_code": string,"id": string,"push_devices": number,"seen_at": string,"streak_best": number,"streak_days": number,"streak_last_day": string,"supporter_tier": string,"total_count": number,"username": string,"xp": number
            }[]
                           },
"admin_log_auth_action":
{ Args: { "action": string,"admin_id": string,"reason": string,"target_user": string }; Returns: undefined
                           },
"admin_rename_user":
{ Args: { "admin_id": string,"reason": string,"user_id": string,"username": string }; Returns: undefined
                           },
"admin_reset_scores":
{ Args: { "admin_id": string,"game"?: string,"reason": string,"user_id": string }; Returns: {
              "runs": number,"xp": number
            }[]
                           },
"admin_set_error_status":
{ Args: { "admin_id": string,"fingerprint": string,"reason"?: string,"status": string }; Returns: undefined
                           },
"admin_set_supporter":
{ Args: { "active": boolean,"admin_id": string,"reason": string,"user_id": string }; Returns: undefined
                           },
"admin_update_feedback":
{ Args: { "admin_id": string,"feedback_id": string,"reason"?: string,"reply": string,"status": string }; Returns: undefined
                           },
"admin_update_legal_document":
{ Args: { "admin_id": string,"body": string,"reason"?: string,"slug": string,"title": string }; Returns: number
                           },
"admin_update_legal_translation":
{ Args: { "admin_id": string,"body": string,"lang": string,"reason"?: string,"slug": string,"title": string }; Returns: undefined
                           },
"admin_visits_by_country":
{ Args: { "days"?: number }; Returns: {
              "avg_seconds": number,"country": string,"pageviews": number,"signups": number,"visitors": number
            }[]
                           },
"admin_visits_daily":
{ Args: { "days"?: number }; Returns: {
              "day": string,"pageviews": number,"signups": number,"visitors": number
            }[]
                           },
"admin_visits_summary":
{ Args: { "days"?: number }; Returns: {
              "avg_seconds": number,"pageviews": number,"signed_in_visitors": number,"signups": number,"visitors": number
            }[]
                           },
"admin_visits_top":
{ Args: { "days"?: number,"dimension": string,"max_rows"?: number }; Returns: {
              "pageviews": number,"value": string,"visitors": number
            }[]
                           },
"apply_match_move":
{ Args: { "end_reason"?: string,"match_id": string,"moves": (number)[],"previous_count": number,"winner"?: string }; Returns: undefined
                           },
"apply_supporter_event":
{ Args: { "active": boolean,"event": string,"payload": Json,"provider": string,"provider_ref": string,"user_id": string }; Returns: boolean
                           },
"cancel_match":
{ Args: { "match_id": string }; Returns: undefined
                           },
"create_challenge":
{ Args: { "friend": string,"run_id": string }; Returns: string
                           },
"create_match":
{ Args: { "game": string,"opponent": string }; Returns: string
                           },
"decline_challenge":
{ Args: { "challenge_id": string }; Returns: undefined
                           },
"delete_account":
{ Args: { "target": string }; Returns: undefined
                           },
"delete_push_subscription":
{ Args: { "endpoint": string }; Returns: undefined
                           },
"finish_run":
{ Args: { "max_tile": number,"moves": string,"run_id": string,"score": number }; Returns: undefined
                           },
"get_battleship_status":
{ Args: Record<PropertyKey, never>; Returns: {
              "match_id": string,"me_ready": boolean,"rival_ready": boolean
            }[]
                           },
"get_conversations":
{ Args: Record<PropertyKey, never>; Returns: {
              "avatar_parts": Json,"avatar_seed": number,"friend_id": string,"last_at": string,"last_body": string,"last_from_me": boolean,"unread": number,"username": string
            }[]
                           },
"get_daily_info":
{ Args: Record<PropertyKey, never>; Returns: {
              "day": string,"game": string,"next_game": string
            }[]
                           },
"get_daily_leaderboard":
{ Args: { "max_rows"?: number,"scope"?: string }; Returns: {
              "achieved_at": string,"avatar_parts": Json,"avatar_seed": number,"rank": number,"score": number,"supporter_tier": string,"user_id": string,"username": string
            }[]
                           },
"get_leaderboard":
{ Args: { "game": string,"max_rows"?: number,"period"?: string,"scope"?: string }; Returns: {
              "achieved_at": string,"avatar_parts": Json,"avatar_seed": number,"rank": number,"score": number,"supporter_tier": string,"user_id": string,"username": string
            }[]
                           },
"get_level_leaderboard":
{ Args: { "max_rows"?: number,"scope"?: string }; Returns: {
              "avatar_parts": Json,"avatar_seed": number,"rank": number,"supporter_tier": string,"user_id": string,"username": string,"xp": number
            }[]
                           },
"get_match_leaderboard":
{ Args: { "games": (string)[],"max_rows"?: number,"period"?: string,"scope"?: string }; Returns: {
              "avatar_parts": Json,"avatar_seed": number,"played": number,"rank": number,"supporter_tier": string,"user_id": string,"username": string,"wins": number
            }[]
                           },
"get_my_achievements":
{ Args: Record<PropertyKey, never>; Returns: {
              "achievement": string,"goal": number,"progress": number,"unlocked_at": string
            }[]
                           },
"get_my_challenges":
{ Args: { "max_rows"?: number }; Returns: {
              "attempt_score": number,"created_at": string,"game": string,"id": string,"incoming": boolean,"other_avatar_parts": Json,"other_avatar_seed": number,"other_id": string,"other_username": string,"status": string,"target_score": number
            }[]
                           },
"get_my_daily":
{ Args: Record<PropertyKey, never>; Returns: {
              "day": string,"game": string,"next_game": string,"played_today": boolean,"players": number,"rank": number,"score": number,"status": string,"streak_best": number,"streak_days": number
            }[]
                           },
"get_my_first_steps":
{ Args: Record<PropertyKey, never>; Returns: {
              "daily": boolean,"friend": boolean,"monster": boolean
            }[]
                           },
"get_my_referrals":
{ Args: Record<PropertyKey, never>; Returns: {
              "active": number,"invited": number
            }[]
                           },
"get_my_standing":
{ Args: { "game": string }; Returns: {
              "best_score": number,"friends_players": number,"friends_rank": number,"global_players": number,"global_rank": number
            }[]
                           },
"get_pending_counts":
{ Args: Record<PropertyKey, never>; Returns: {
              "challenges": number,"friend_requests": number,"match_invites": number,"my_turn": number
            }[]
                           },
"get_unread_messages":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"get_wordle_friends":
{ Args: { "lang"?: string }; Returns: {
              "attempts": number,"avatar_parts": Json,"avatar_seed": number,"patterns": (string)[],"solved": boolean,"user_id": string,"username": string
            }[]
                           },
"mark_announcements_seen":
{ Args: { "ids": (string)[] }; Returns: undefined
                           },
"mark_conversation_read":
{ Args: { "friend": string }; Returns: undefined
                           },
"record_github_contribution":
{ Args: { "github_login": string,"kind": string,"url": string,"user_id": string }; Returns: boolean
                           },
"record_visit":
{ Args: { "country"?: string,"device"?: string,"kind": string,"lang"?: string,"path"?: string,"referrer"?: string,"seconds"?: number,"signed_in"?: boolean,"visitor": string }; Returns: undefined
                           },
"reject_run":
{ Args: { "reason": string,"run_id": string }; Returns: undefined
                           },
"remove_friend":
{ Args: { "friend_id": string }; Returns: undefined
                           },
"report_app_error":
{ Args: { "app_version"?: string,"message": string,"path"?: string,"source"?: string,"stack"?: string,"user_agent"?: string,"user_id"?: string }; Returns: string
                           },
"report_pong_result":
{ Args: { "match_id": string,"o_score": number,"x_score": number }; Returns: string
                           },
"report_tron_result":
{ Args: { "match_id": string,"o_score": number,"x_score": number }; Returns: string
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
"save_push_subscription":
{ Args: { "auth": string,"endpoint": string,"p256dh": string }; Returns: undefined
                           },
"send_friend_request":
{ Args: { "friend_code": string }; Returns: string
                           },
"send_message":
{ Args: { "body": string,"recipient": string }; Returns: {
              "body": string,
"created_at": string,
"id": string,
"kind": string,
"read_at": string | null,
"recipient_id": string,
"ref_id": string | null,
"sender_id": string
            }
                          SetofOptions: {
        from: "*"
        to: "messages"
        isOneToOne: true
        isSetofReturn: false
      } },
"send_sticker":
{ Args: { "recipient": string,"sticker": string }; Returns: {
              "body": string,
"created_at": string,
"id": string,
"kind": string,
"read_at": string | null,
"recipient_id": string,
"ref_id": string | null,
"sender_id": string
            }
                          SetofOptions: {
        from: "*"
        to: "messages"
        isOneToOne: true
        isSetofReturn: false
      } },
"set_presence":
{ Args: { "path": string }; Returns: undefined
                           },
"start_challenge_run":
{ Args: { "challenge_id": string }; Returns: {
              "id": string,"seed": number
            }[]
                           },
"start_daily_run":
{ Args: Record<PropertyKey, never>; Returns: {
              "game": string,"id": string,"seed": number
            }[]
                           },
"start_run":
{ Args: { "game": string }; Returns: {
              "id": string,"seed": number
            }[]
                           },
"submit_battleship_fleet":
{ Args: { "match_id": string,"player_id": string,"ships": Json }; Returns: undefined
                           },
"submit_feedback":
{ Args: { "app_version"?: string,"body"?: string,"kind": string,"path"?: string,"rating"?: number,"user_agent"?: string }; Returns: string
                           },
"submit_match_choice":
{ Args: { "choice": number,"match_id": string,"player_id": string }; Returns: number
                           },
"toggle_pinned_game":
{ Args: { "game": string }; Returns: boolean
                           },
"user_id_by_email":
{ Args: { "email": string }; Returns: string
                           },
"user_id_by_friend_code":
{ Args: { "code": string }; Returns: string
                           },
"wordle_add_guess":
{ Args: { "game_day": string,"guess": string,"lang"?: string,"pattern": string,"player": string }; Returns: {
              "day": string,
"finished_at": string | null,
"guesses": (string)[],
"lang": string,
"patterns": (string)[],
"solved": boolean,
"user_id": string
            }
                          SetofOptions: {
        from: "*"
        to: "wordle_games"
        isOneToOne: true
        isSetofReturn: false
      } },
"wordle_today":
{ Args: { "candidates": (string)[],"lang"?: string }; Returns: {
              "day": string,"word": string
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
