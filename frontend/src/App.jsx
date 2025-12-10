import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const API_BASE = 'http://localhost:8000/api';

function App() {
  const [status, setStatus] = useState(null);
  const [screenshotUrl, setScreenshotUrl] = useState('');
  const [instruction, setInstruction] = useState('');

  // Use a ref to track the previous running state to avoid closure staleness in setInterval
  const lastRunningRef = useRef(false);

  useEffect(() => {
    // Initial fetch to sync instruction and force one screenshot load
    const initFetch = async () => {
      try {
        const res = await axios.get(`${API_BASE}/status`);
        setStatus(res.data);
        if (res.data.instruction) {
          setInstruction(res.data.instruction);
        }
        // Always load the screenshot once on startup so the screen isn't empty
        updateScreenshot();

        // Update ref
        lastRunningRef.current = res.data.running;
      } catch (err) {
        console.error("Initial fetch failed", err);
      }
    };
    initFetch();

    // Start polling
    const interval = setInterval(fetchStatus, 3000); // Poll every 3s
    return () => clearInterval(interval);
  }, []);

  const updateScreenshot = () => {
    const newUrl = `${API_BASE}/screenshot?t=${Date.now()}`;
    const img = new Image();
    img.src = newUrl;
    img.onload = () => {
      setScreenshotUrl(newUrl);
    };
  };

  const fetchStatus = async () => {
    try {
      const res = await axios.get(`${API_BASE}/status`);
      const newStatus = res.data;

      // Determine if we should update the screenshot
      // 1. If currently running
      // 2. If it WAS running but just stopped (to get the final result)
      const isRunning = newStatus.running;
      const wasRunning = lastRunningRef.current;

      if (isRunning || (wasRunning && !isRunning)) {
        updateScreenshot();
      }

      // Update ref and state
      lastRunningRef.current = isRunning;
      setStatus(newStatus);
    } catch (err) {
      console.error("Failed to fetch status", err);
    }
  };

  const handleStop = async () => {
    await axios.post(`${API_BASE}/stop`);
  };

  const handleStart = async () => {
    if (!instruction) {
      alert("Please enter an instruction first!");
      return;
    }
    // Update instruction before starting to be sure
    try {
      await axios.post(`${API_BASE}/instruction`, { instruction: instruction });
      await axios.post(`${API_BASE}/start`);
    } catch (err) {
      alert('Failed to start agent');
    }
  };

  if (!status) return <div className="container">Loading...</div>;

  return (
    <div className="container">
      <div className="left-panel">
        <div className="screenshot-container">
          <h3>Live View</h3>
          {screenshotUrl && <img src={screenshotUrl} alt="Device Screenshot" className="screenshot" />}
        </div>
      </div>

      <div className="right-panel">
        <div className="status-box">
          <h2>UITARS Agent Control</h2>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Instruction:</label>
            <input
              type="text"
              value={instruction}
              onChange={(e) => {
                setInstruction(e.target.value);
                // Optional: auto-sync or sync on start
              }}
              placeholder="Enter your instruction here (e.g., Open settings)"
              disabled={status.running}
            />
          </div>

          <div className="control-panel">
            {!status.running ? (
              <button onClick={handleStart} disabled={!instruction}>Start Agent</button>
            ) : (
              <button className="stop" onClick={handleStop}>Stop Agent</button>
            )}
          </div>

          <p style={{ marginTop: '10px' }}>
            <strong>Status:</strong> {status.running ? <span style={{ color: 'green' }}>Running</span> : <span style={{ color: 'red' }}>Stopped</span>} | <strong>Iteration:</strong> {status.iter}
          </p>
        </div>

        <div className="status-box">
          <h3>Latest Thought</h3>
          <p>{status.latest_thought || "No thoughts yet..."}</p>
        </div>

        <div className="status-box">
          <h3>Latest Action</h3>
          <p>{status.latest_action || "No action yet..."}</p>
        </div>

        <h3>Full Log</h3>
        <div className="log-box">
          {status.latest_log || "Waiting for logs..."}
        </div>
      </div>
    </div>
  );
}

export default App;
