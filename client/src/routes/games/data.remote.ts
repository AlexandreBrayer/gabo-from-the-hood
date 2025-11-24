import { fetchGameList } from '$lib/modules/GameList/index.server';
import { query } from '$app/server';

export const getGameList = query(fetchGameList);
