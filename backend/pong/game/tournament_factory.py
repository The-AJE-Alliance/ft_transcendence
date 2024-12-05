# tournament_factory.py
from .tournament_registry import tournaments
from .tournament import TournamentManager
import asyncio
import logging

logger = logging.getLogger(__name__)

# Verrou global pour la création de tournois
tournament_creation_lock = asyncio.Lock()


async def get_or_create_tournament(tournament_id, host_user_id):
    async with tournament_creation_lock:
        if tournament_id not in tournaments:
            logger.info(
                f"Creating new TournamentManager for tournament_id: {tournament_id}"
            )
            tournaments[tournament_id] = TournamentManager(tournament_id, host_user_id)
            asyncio.create_task(tournaments[tournament_id].start())
            logger.info(
                f"Created new TournamentManager for tournament_id: {tournament_id}"
            )
        else:
            logger.info(
                f"Retrieved existing TournamentManager for tournament_id: {tournament_id}"
            )
        return tournaments[tournament_id]
