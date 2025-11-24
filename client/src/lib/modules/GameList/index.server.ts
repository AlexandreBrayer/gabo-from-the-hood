
import type { GameListResponse } from '$server-types';
import { SERVER_URL } from '$env/static/private';

export async function fetchGameList(): Promise<GameListResponse> {
  const response = await fetch(`${SERVER_URL}/api/games`);

  if (!response.ok) {
    throw new Error(`Failed to fetch games: ${response.statusText}`);
  }
  
  return await response.json();
}