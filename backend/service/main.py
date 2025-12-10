from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
import os
import sys

# Ensure we can import agent_runner
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from agent_runner import UITARSRunner

runner = UITARSRunner()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup logic
    # runner.start()
    yield
    # Shutdown logic
    runner.stop()

app = FastAPI(lifespan=lifespan)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For development convenience
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/status")
async def get_status():
    return {
        "running": runner.running,
        "instruction": runner.instruction,
        "latest_thought": runner.latest_thought,
        "latest_action": runner.latest_action,
        "latest_log": runner.latest_log,
        "iter": runner.iter
    }

@app.get("/api/screenshot")
async def get_screenshot():
    # Return the current screenshot
    # If using runner.screenshot_file directly, make sure it exists
    if os.path.exists(runner.screenshot_file):
        # We might want to disable caching so the frontend always gets the new one
        return FileResponse(runner.screenshot_file, headers={"Cache-Control": "no-cache"})
    return {"error": "Screenshot not available yet"}

class InstructionRequest(BaseModel):
    instruction: str

@app.post("/api/instruction")
async def update_instruction(req: InstructionRequest):
    runner.update_instruction(req.instruction)
    return {"status": "updated", "instruction": runner.instruction}

@app.post("/api/stop")
async def stop_agent():
    runner.stop()
    return {"status": "stopped"}

@app.post("/api/start")
async def start_agent():
    runner.start()
    return {"status": "started"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
