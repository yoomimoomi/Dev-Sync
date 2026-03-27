from fastapi import FastAPI
app = FastAPI(title = "Devsync")
@app.get("/")
async def root():
    return {"message": "Devsync in progress"}

@app.get("/health")
async def health_check():
    return {"status": "ok"}
