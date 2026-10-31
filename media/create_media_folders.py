#!/usr/bin/env python3
"""
Script to create IMDb Top 250 movie folder structure for a demo.
"""

import os
import shutil
import re
from pathlib import Path

# IMDb Top 250 movies list
MOVIES = [
    "The Shawshank Redemption (1994)",
    "The Godfather (1972)", 
    "The Dark Knight (2008)",
    "The Godfather Part II (1974)",
    "12 Angry Men (1957)",
    "The Lord of the Rings: The Return of the King (2003)",
    "Schindler's List (1993)",
    "Pulp Fiction (1994)",
    "The Lord of the Rings: The Fellowship of the Ring (2001)",
    "The Good, the Bad and the Ugly (1966)",
    "Forrest Gump (1994)",
    "The Lord of the Rings: The Two Towers (2002)",
    "Fight Club (1999)",
    "Inception (2010)",
    "Star Wars: Episode V - The Empire Strikes Back (1980)",
    "The Matrix (1999)",
    "Goodfellas (1990)",
    "Interstellar (2014)",
    "One Flew Over the Cuckoo's Nest (1975)",
    "Se7en (1995)",
    "It's a Wonderful Life (1946)",
    "The Silence of the Lambs (1991)",
    "Seven Samurai (1954)",
    "Saving Private Ryan (1998)",
    "The Green Mile (1999)",
    "City of God (2002)",
    "Life Is Beautiful (1997)",
    "Terminator 2: Judgment Day (1991)",
    "Star Wars: Episode IV - A New Hope (1977)",
    "Back to the Future (1985)",
    "Spirited Away (2001)",
    "The Pianist (2002)",
    "Gladiator (2000)",
    "Parasite (2019)",
    "Psycho (1960)",
    "The Lion King (1994)",
    "Grave of the Fireflies (1988)",
    "The Departed (2006)",
    "Whiplash (2014)",
    "Harakiri (1962)",
    "The Prestige (2006)",
    "American History X (1998)",
    "Léon: The Professional (1994)",
    "Spider-Man: Across the Spider-Verse (2023)",
    "Casablanca (1942)",
    "Cinema Paradiso (1988)",
    "The Usual Suspects (1995)",
    "The Intouchables (2011)",
    "Alien (1979)",
    "Modern Times (1936)",
    "Rear Window (1954)",
    "Once Upon a Time in the West (1968)",
    "Django Unchained (2012)",
    "City Lights (1931)",
    "Apocalypse Now (1979)",
    "WALL·E (2008)",
    "Memento (2000)",
    "Dune: Part Two (2024)",
    "Raiders of the Lost Ark (1981)",
    "Avengers: Infinity War (2018)",
    "The Lives of Others (2006)",
    "Sunset Boulevard (1950)",
    "Spider-Man: Into the Spider-Verse (2018)",
    "Witness for the Prosecution (1957)",
    "Paths of Glory (1957)",
    "The Shining (1980)",
    "The Great Dictator (1940)",
    "12th Fail (2023)",
    "Inglourious Basterds (2009)",
    "Aliens (1986)",
    "The Dark Knight Rises (2012)",
    "Coco (2017)",
    "Amadeus (1984)",
    "Avengers: Endgame (2019)",
    "Toy Story (1995)",
    "Good Will Hunting (1997)",
    "Dr. Strangelove or: How I Learned to Stop Worrying and Love the Bomb (1964)",
    "Oldboy (2003)",
    "High and Low (1963)",
    "Das Boot (1981)",
    "Braveheart (1995)",
    "American Beauty (1999)",
    "Princess Mononoke (1997)",
    "Your Name. (2016)",
    "3 Idiots (2009)",
    "Joker (2019)",
    "Capernaum (2018)",
    "Once Upon a Time in America (1984)",
    "Singin' in the Rain (1952)",
    "Come and See (1985)",
    "Requiem for a Dream (2000)",
    "Star Wars: Episode VI - Return of the Jedi (1983)",
    "Toy Story 3 (2010)",
    "The Hunt (2012)",
    "Ikiru (1952)",
    "Eternal Sunshine of the Spotless Mind (2004)",
    "Incendies (2010)",
    "The Apartment (1960)",
    "2001: A Space Odyssey (1968)",
    "Lawrence of Arabia (1962)",
    "Reservoir Dogs (1992)",
    "Scarface (1983)",
    "Heat (1995)",
    "Double Indemnity (1944)",
    "North by Northwest (1959)",
    "Up (2009)",
    "M (1931)",
    "Citizen Kane (1941)",
    "Full Metal Jacket (1987)",
    "Vertigo (1958)",
    "Amélie (2001)",
    "Like Stars on Earth (2007)",
    "A Separation (2011)",
    "To Kill a Mockingbird (1962)",
    "Die Hard (1988)",
    "Indiana Jones and the Last Crusade (1989)",
    "The Sting (1973)",
    "A Clockwork Orange (1971)",
    "Metropolis (1927)",
    "Oppenheimer (2023)",
    "The Chaos Class Failed the Class (1975)",
    "Snatch (2000)",
    "1917 (2019)",
    "L.A. Confidential (1997)",
    "Bicycle Thieves (1948)",
    "Downfall (2004)",
    "Dangal (2016)",
    "The Wolf of Wall Street (2013)",
    "Hamilton (2020)",
    "Green Book (2018)",
    "Taxi Driver (1976)",
    "The Truman Show (1998)",
    "Batman Begins (2005)",
    "For a Few Dollars More (1965)",
    "Judgment at Nuremberg (1961)",
    "Some Like It Hot (1959)",
    "Shutter Island (2010)",
    "The Kid (1921)",
    "The Father (2020)",
    "Jurassic Park (1993)",
    "All About Eve (1950)",
    "There Will Be Blood (2007)",
    "The Sixth Sense (1999)",
    "Ran (1985)",
    "Casino (1995)",
    "Top Gun: Maverick (2022)",
    "No Country for Old Men (2007)",
    "The Thing (1982)",
    "Unforgiven (1992)",
    "Pan's Labyrinth (2006)",
    "Kill Bill: Vol. 1 (2003)",
    "A Beautiful Mind (2001)",
    "Prisoners (2013)",
    "The Treasure of the Sierra Madre (1948)",
    "The Best of Youth (2003)",
    "Yojimbo (1961)",
    "Finding Nemo (2003)",
    "Howl's Moving Castle (2004)",
    "The Great Escape (1963)",
    "Monty Python and the Holy Grail (1975)",
    "The Elephant Man (1980)",
    "Dial M for Murder (1954)",
    "Klaus (2019)",
    "Gone with the Wind (1939)",
    "The Secret in Their Eyes (2009)",
    "Chinatown (1974)",
    "Lock, Stock and Two Smoking Barrels (1998)",
    "Rashomon (1950)",
    "V for Vendetta (2005)",
    "Inside Out (2015)",
    "Three Billboards Outside Ebbing, Missouri (2017)",
    "Catch Me If You Can (2002)",
    "Trainspotting (1996)",
    "The Bridge on the River Kwai (1957)",
    "Raging Bull (1980)",
    "Fargo (1996)",
    "The Grand Budapest Hotel (2014)",
    "On the Waterfront (1954)",
    "The Gold Rush (1925)",
    "My Neighbor Totoro (1988)",
    "The Third Man (1949)",
    "Singin' in the Rain (1952)",
    "Jai Bhim (2021)",
    "The Wages of Fear (1953)",
    "Stalker (1979)",
    "Gran Torino (2008)",
    "Gone Girl (2014)",
    "Tokyo Story (1953)",
    "In Bruges (2008)",
    "Wild Strawberries (1957)",
    "Sunset Blvd. (1950)",
    "The General (1926)",
    "Persona (1966)",
    "The Deer Hunter (1978)",
    "The Big Lebowski (1998)",
    "Barry Lyndon (1975)",
    "Memories of Murder (2003)",
    "The Handmaiden (2016)",
    "The Seventh Seal (1957)",
    "Klaus (2019)",
    "Rififi (1955)",
    "Castle in the Sky (1986)",
    "Blade Runner (1982)",
    "The Passion of Joan of Arc (1928)",
    "Patton (1970)",
    "The 400 Blows (1959)",
    "Andrei Rublev (1966)",
    "Amour (2012)",
    "8½ (1963)",
    "The Rules of the Game (1939)",
    "Cool Hand Luke (1967)",
    "The Maltese Falcon (1941)",
    "Throne of Blood (1957)",
    "Haider (2014)",
    "Network (1976)",
    "The Princess Bride (1987)",
    "The Night of the Hunter (1955)",
    "Rebecca (1940)",
    "The Pianist (2002)",
    "Mad Max: Fury Road (2015)",
    "The Cabinet of Dr. Caligari (1920)",
    "Sansho the Bailiff (1954)",
    "Notorious (1946)",
    "Modern Times (1936)",
    "Winter Sleep (2014)",
    "Sherlock Jr. (1924)",
    "The Best Years of Our Lives (1946)",
    "Once Upon a Time in Anatolia (2011)",
    "Sholay (1975)",
    "Zootopia (2016)",
    "Le Mans '66 (2019)",
    "Before Sunset (2004)",
    "La Dolce Vita (1960)",
    "Come and See (1985)",
    "Mulholland Drive (2001)",
    "Parasite (2019)",
    "Burning (2018)",
    "Pather Panchali (1955)",
    "The Man from Earth (2007)",
    "Hotel Rwanda (2004)",
    "Spotlight (2015)",
    "Roma (2018)",
    "The Handmaiden (2016)",
    "Portrait of a Lady on Fire (2019)",
    "The Godfather Part III (1990)",
    "Minari (2020)",
    "Sound of Metal (2019)"
]

def sanitize_filename(filename):
    """Remove or replace characters that are invalid in Windows filenames"""
    # Replace problematic characters
    filename = re.sub(r'[<>:"/\\|?*]', '', filename)
    # Remove trailing dots and spaces
    filename = filename.rstrip('. ')
    return filename

def create_movie_folders():
    """Create folder structure for Top 250 movies"""
    base_path = Path(__file__).parent
    movies_dir = base_path / "movies"
    demo_video = base_path / "show-stream-demo.mp4"
    
    # Check if demo video exists
    if not demo_video.exists():
        print(f"Error: {demo_video} not found!")
        return
    
    # Create movies directory if it doesn't exist
    movies_dir.mkdir(exist_ok=True)
    
    print(f"Creating folders for {len(MOVIES)} movies...")
    
    for i, movie in enumerate(MOVIES, 1):
        # Sanitize the movie name for filesystem
        safe_movie_name = sanitize_filename(movie)
        movie_folder = movies_dir / safe_movie_name
        
        # Create movie folder
        movie_folder.mkdir(exist_ok=True)
        
        # Copy and rename the demo video
        video_filename = f"{safe_movie_name}.mp4"
        video_path = movie_folder / video_filename
        
        if not video_path.exists():
            shutil.copy2(demo_video, video_path)
            print(f"{i:3d}. Created: {safe_movie_name}")
        else:
            print(f"{i:3d}. Exists:  {safe_movie_name}")
    
    print(f"\nCompleted! Created {len(MOVIES)} movie folders in {movies_dir}")

if __name__ == "__main__":
    create_movie_folders()
