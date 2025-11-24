<script lang="ts">
   import {getGameList} from '$routes/games/data.remote';
   const gameList = await getGameList();
</script>

<p>
    {JSON.stringify(gameList)}
</p>
