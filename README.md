# ShowStream

A self-deployable media server built using typescript.

## Setup

Before being able to setup the project, some configurations are required.

### Env Dotfiles

For the API server (`apps/api-server`), the `.env.example` needs to be renamed to `.env`.  
In this `.env`, the JWT, MongoDB and TMDB API values need to be set.

- For the server's authentication (JWT), a JWT_SECRET is required.  
This should be a >128bit key, example generations can be found at <https://jwtsecrets.com/>.  
- To access the local database, the server needs the MongoDB credentials. These are setup in `docker-compose.yml` under the `mongodb` image as:
  - MONGODB_INITDB_ROOT_USERNAME - (MONGO_DB_USERNAME in `.env`)
  - MONGODB_INITDB_ROOT_PASSWORD - (MONGO_DB_PASSWORD in `.env`)

- Lastly, for the media data scans, the server needs access keys for the [TMDB API](https://developer.themoviedb.org/docs/getting-started).  
You need to create a free account for this and after creating it you can access:
  - A Read Access Token - (TMDB_API_READ_ACCESS_TOKEN in `.env`)
  - And a API Key - (TMDB_API_KEY in `.env`)

### Media and Data Folders

To be able to setup a persistent database with your own movies and shows, two folders need to be setup: `/media` and `/data`.  
These are heavily reliant on your setup, but you should ensure that these are both persistent outside of the docker containers.  
`/media` should contain two folders: `/media/movies` for storing movies and `/media/shows` for storing shows.
Both of them have strict naming conventions for their actual content. For `/movies`, every movie should have its own folder that is named "Movie Name (Year)", e.g "The Dark Knight (2008)" and its actual video file should be put in that folder with the exact same name. (shows are currently not supported yet).  
`/data` is the folder that the MongoDB Database will use. So in order to keep the database persistent it should be mounted to the `mongodb` image in `docker-compose.yml`.

### Docker

Lastly, to actually run the project you need Docker.  
The script `build-docker.sh` is provided, which automatically creates the entire docker setup.  
To configure it you can use `docker-compose.yml`, which contains all the configs for the images used in the project.
