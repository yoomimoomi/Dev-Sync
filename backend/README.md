We will be using uv to manage python dependencies
# Setup
Install [uv](https://docs.astral.sh/uv/getting-started/installation/) and navigate to the backend directory in the terminal. Run uv sync
```
cd backend
uv sync
```
To add additional dependencies as necessary, use 
```uv add 
uv add [package 1] [package 2]
```
To make sure all packages are the same between collaborators, use
```
uv sync
```
# Run
To start up the server, use 
```
uv run uvicorn main:app
```
