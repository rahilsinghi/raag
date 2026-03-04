"""Seed the database with Seedhe Maut's complete discography metadata.

This pre-populates artists, albums, and songs tables with known metadata
so the download and ingestion pipeline can use exact track info for
matching and organization.

Usage:
    python ml/scripts/seed_discography.py
"""

import asyncio
import logging
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "backend"))

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)-7s %(message)s",
)
logger = logging.getLogger("seed")

# ── Complete Seedhe Maut Discography ─────────────────────────────────
ARTIST = {
    "name": "Seedhe Maut",
    "slug": "seedhe-maut",
}

DISCOGRAPHY = [
    {
        "name": "2 Ka Pahada",
        "slug": "2-ka-pahada",
        "release_year": 2017,
        "album_type": "ep",
        "tracks": [
            "Royalty",
            "Kashmakush",
            "Hanging On",
            "Stay Calm",
            "Class-Sikh Maut",
            "Seedhe Maut Anthem",
        ],
    },
    {
        "name": "Bayaan",
        "slug": "bayaan",
        "release_year": 2018,
        "album_type": "album",
        "tracks": [
            "Intro",
            "Shaktimaan",
            "Gehraiyaan (ft. Vaksh)",
            "Uss Din",
            "Jolly (Skit)",
            "Meri Baggi",
            "Dehshat",
            "PNP",
            "Pankh (ft. Bawari Basanti)",
            "EDOKDOG (Skit)",
            "Kyu",
            "Chalta Reh",
        ],
    },
    {
        "name": "न (Mixtape)",
        "slug": "n",
        "release_year": 2021,
        "album_type": "mixtape",
        "tracks": [
            "Namastute",
            "Naamcheen",
            "No Enema (ft. Foreign Beggars & Sez on the Beat)",
            "Nanchaku (ft. MC Stan)",
            "Nafrat (ft. DJ Sa)",
            "Nazarbattu Freestyle",
            "Nawazuddin",
            "Na Jaye",
            "Nadaan",
            "Natkhat",
        ],
    },
    {
        "name": "Nayaab",
        "slug": "nayaab",
        "release_year": 2022,
        "album_type": "album",
        "tracks": [
            "Nayaab",
            "Toh Kya",
            "Hoshiyaar",
            "Anaadi",
            "Dum Ghutte",
            "Maina",
            "Choti Soch",
            "Godkode",
            "Teen Dost",
            "Gandi Aulaad",
            "Batti",
            "Toh Kya (Remix)",
            "Kohra",
            "Do Guna",
            "Jeetna",
            "Nayaab (Remix)",
            "Imperfect",
        ],
    },
    {
        "name": "Lunch Break",
        "slug": "lunch-break",
        "release_year": 2023,
        "album_type": "mixtape",
        "tracks": [
            "11K",
            "Sick & Proper",
            "Brand New",
            "Peace of Mind",
            "Pushpak Vimaan",
            "Dikkat",
            "Kya Challa",
            "Fanne Khan",
            "First Place",
            "Champions",
            "Baat Aisi Ghar Jaisi",
            "Naam Kaam Sheher",
            "Pain",
            "Hausla",
            "Lunch Break",
            "Asal G",
            "Swah!",
            "Focused Sedated",
            "Taakat",
            "Off Beat",
            "Luka Chippi",
            "Khauf",
            "I Don't Miss That Life",
            "Akatsuki",
            "Khoon",
            "W",
            "Joint in the Booth",
            "Khatta Flow",
            "Kavi",
            "Kehna Chahte Hain...",
        ],
    },
    {
        "name": "Shakti",
        "slug": "shakti",
        "release_year": 2024,
        "album_type": "ep",
        "tracks": [
            "Khush Nahi",
            "Soi Nahi",
            "Naksha",
            "Raat Ki Raani",
        ],
    },
    {
        "name": "Kshama",
        "slug": "kshama",
        "release_year": 2024,
        "album_type": "album",
        "tracks": [
            "RED",
            "ICE",
            "Gourmet Shit! (ft. Raftaar)",
            "Moon Comes Up (ft. Badshah)",
            "Round 3",
            "Naraaz",
            "Brahamachari (ft. GhAatak & Raga)",
            "Shakti Aur Kshama",
        ],
    },
    {
        "name": "DL91 FM",
        "slug": "dl91-fm",
        "release_year": 2025,
        "album_type": "album",
        "tracks": [
            "CD",
            "Akela",
            "DL91 FM",
            "Pickup",
            "Maar Kaat",
            "Video Games",
            "KTMN",
            "Bechara",
        ],
    },
]

# ── Notable singles not on albums ────────────────────────────────────
SINGLES = [
    {"title": "101", "year": 2017},
    {"title": "Do Guna", "year": 2020},
    {"title": "Ball", "year": 2020},
    {"title": "Dum Pishaach", "year": 2020},
    {"title": "MMM", "year": 2019},
    {"title": "Yaad", "year": 2019},
    {"title": "Saans Le", "year": 2019},
    {"title": "Scalp Dem (ft. Delhi Sultanate)", "year": 2019},
    {"title": "Chalo Chalein (ft. Ritviz)", "year": 2019},
    {"title": "Sar Utha", "year": 2021},
    {"title": "नalla Freestyle", "year": 2021},
    {"title": "Khush Nahi (Single)", "year": 2022},
    {"title": "Bure Din (ft. Mick Jenkins)", "year": 2022},
    {"title": "Shaayar (ft. Bharat Chauhan)", "year": 2022},
    {"title": "Hola Amigo (ft. KR$NA)", "year": 2023},
    {"title": "Kodak", "year": 2023},
    {"title": "Shutdown", "year": 2023},
    {"title": "Mudda (ft. Yung Sammy)", "year": 2023},
]


async def seed():
    from sqlalchemy import select

    from app.db.postgres import Album, Artist, Song, async_session

    # 1. Create or get artist
    async with async_session() as session:
        async with session.begin():
            result = await session.execute(
                select(Artist).where(Artist.slug == ARTIST["slug"])
            )
            artist = result.scalar_one_or_none()
            if not artist:
                artist = Artist(name=ARTIST["name"], slug=ARTIST["slug"])
                session.add(artist)
                await session.flush()
                logger.info("Created artist: %s", artist.name)
            else:
                logger.info("Artist exists: %s (id=%s)", artist.name, artist.id)
            artist_id = artist.id

    # 2. Seed albums + tracks
    total_albums = 0
    total_songs = 0

    for album_data in DISCOGRAPHY:
        async with async_session() as session:
            async with session.begin():
                result = await session.execute(
                    select(Album).where(
                        Album.artist_id == artist_id,
                        Album.slug == album_data["slug"],
                    )
                )
                album = result.scalar_one_or_none()
                if not album:
                    album = Album(
                        artist_id=artist_id,
                        title=album_data["name"],
                        slug=album_data["slug"],
                        release_year=album_data["release_year"],
                        metadata_={"album_type": album_data["album_type"]},
                    )
                    session.add(album)
                    await session.flush()
                    total_albums += 1
                    logger.info("Created album: %s (%d tracks)", album.title, len(album_data["tracks"]))
                else:
                    logger.info("Album exists: %s (id=%s)", album.title, album.id)

                album_id = album.id

                # Seed tracks
                for i, title in enumerate(album_data["tracks"], start=1):
                    result = await session.execute(
                        select(Song).where(
                            Song.album_id == album_id,
                            Song.track_number == i,
                        )
                    )
                    existing = result.scalar_one_or_none()
                    if not existing:
                        song = Song(
                            album_id=album_id,
                            title=title,
                            track_number=i,
                            metadata_={"seeded": True, "needs_audio": True, "needs_lyrics": True},
                        )
                        session.add(song)
                        total_songs += 1

    # 3. Seed singles as a "Singles" album
    async with async_session() as session:
        async with session.begin():
            result = await session.execute(
                select(Album).where(
                    Album.artist_id == artist_id,
                    Album.slug == "singles",
                )
            )
            singles_album = result.scalar_one_or_none()
            if not singles_album:
                singles_album = Album(
                    artist_id=artist_id,
                    title="Singles & Features",
                    slug="singles",
                    metadata_={"album_type": "singles"},
                )
                session.add(singles_album)
                await session.flush()
                total_albums += 1
                logger.info("Created singles collection")

            for i, single in enumerate(SINGLES, start=1):
                result = await session.execute(
                    select(Song).where(
                        Song.album_id == singles_album.id,
                        Song.title == single["title"],
                    )
                )
                existing = result.scalar_one_or_none()
                if not existing:
                    song = Song(
                        album_id=singles_album.id,
                        title=single["title"],
                        track_number=i,
                        metadata_={
                            "seeded": True,
                            "needs_audio": True,
                            "needs_lyrics": True,
                            "release_year": single["year"],
                        },
                    )
                    session.add(song)
                    total_songs += 1

    print(f"\n=== Seed Complete ===")
    print(f"  Albums created: {total_albums}")
    print(f"  Songs created: {total_songs}")
    print(f"  Total albums in discography: {len(DISCOGRAPHY) + 1}")
    print(f"  Total songs in discography: {sum(len(a['tracks']) for a in DISCOGRAPHY) + len(SINGLES)}")


if __name__ == "__main__":
    asyncio.run(seed())
