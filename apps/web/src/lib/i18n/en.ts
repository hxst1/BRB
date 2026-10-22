import { makeFormat } from "@/lib/format";
import type { Messages } from "./index";

export const en: Messages = {
  format: makeFormat("en"),
  common: {
    close: "Close",
    cancel: "Cancel",
    save: "Save",
    saving: "Saving…",
    saved: "Saved",
    later: "Later",
    play: "Play",
    signIn: "Sign in",
    signUp: "Sign up",
    signUpFree: "Sign up free",
    back: "Back",
    backHome: "Back to home",
    you: "you",
    retry: "Please try again.",
    error: "Something went wrong. Please try again.",
    supporter: "Supports the project",
  },
  nav: {
    home: "Home",
    chat: "Chat",
    ranking: "Ranking",
    friends: "Friends",
    me: "You",
    main: "Main",
    profileAndMonster: "Your profile and your monster",
    friendsAndCode: "Friends and invite code",
    feedback: "Report a problem or suggest something",
    signOut: "Sign out",
    pending: (n: number) => `${n} pending`,
    unread: (n: number) => `${n} unread messages`,
    requests: (n: number) => `${n} friend requests`,
  },
  level: {
    level: (n: number) => `Level ${n}`,
    toNext: (into: number, total: number, next: number) => `${into} / ${total} XP to level ${next}`,
    progress: (next: number) => `Progress to level ${next}`,
  },
};
