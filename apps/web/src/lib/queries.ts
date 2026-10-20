/** Columnas públicas de un jugador para listas, rankings y partidas. */
export const PLAYER_COLUMNS = "id, username, avatar_seed, avatar_parts";

/** Partida con los perfiles de los dos jugadores. */
export const MATCH_WITH_PLAYERS = `*, x:profiles!matches_player_x_fkey(${PLAYER_COLUMNS}), o:profiles!matches_player_o_fkey(${PLAYER_COLUMNS})`;
