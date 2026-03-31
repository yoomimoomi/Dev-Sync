from fastapi import FastAPI,Depends
from fastapi.security import OAuth2PasswordBearer
from typing import Annotated


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")
app = FastAPI(title = "Devsync")
@app.get("/")
async def root():
    return {"message": "Devsync in progress"}

@app.get("/health")
async def health_check():
    return {"status": "ok"}

@app.get("/tokentest")
async def token_test(token : Annotated[str, Depends(oauth2_scheme)]):
    return {"token": token}

