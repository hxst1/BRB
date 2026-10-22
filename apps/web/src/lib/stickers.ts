import type { Sticker } from "@repo/avatars";

/**
 * Stickers del chat. En la base de datos se guarda el emoji (lo que se ve en
 * la lista de chats y en los avisos); aquí, qué dibujo le corresponde.
 * Tiene que coincidir con private.sticker_emoji (lo comprueba stickers.test.ts).
 */
export const STICKER_LIST: { id: Sticker; emoji: string; label: string }[] = [
  { id: "laugh", emoji: "😂", label: "Risa" },
  { id: "cry", emoji: "😭", label: "Llorar" },
  { id: "sad", emoji: "😢", label: "Triste" },
  { id: "angry", emoji: "😠", label: "Enfadado" },
  { id: "love", emoji: "😍", label: "Me encanta" },
  { id: "shock", emoji: "😱", label: "¡Qué!" },
];

export function stickerFromEmoji(emoji: string) {
  return STICKER_LIST.find((sticker) => sticker.emoji === emoji) ?? null;
}
