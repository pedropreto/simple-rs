import { useState, useEffect } from "react";
import "./App.css"; // Make sure your CSS with .button-grid, .node-button, etc. is here


function App() {
  const [nodes, setNodes] = useState({ woodcutting: {}, mining: {} });
  const [game, setGame] = useState(null);
  const [timers, setTimers] = useState({});
  const [currentSkill, setCurrentSkill] = useState(null); // new: selected skill

  // Load nodes and game state
  const loadNodes = async () => {
    const res = await fetch("http://127.0.0.1:5000/nodes");
    const data = await res.json();
    setNodes(data);
  };

  const loadState = async () => {
    const res = await fetch("http://127.0.0.1:5000/state");
    const data = await res.json();
    setGame(data);
  };

  useEffect(() => {
    loadNodes(); // loads all nodes for all skills
    loadState(); // loads the game state save (info about the character)
  }, []);

  // Start job
  // Called when clicking a button to cut a tree or mine a rock
  // skill was the current skill chosen and node is the tree or rock chosen
  const startJob = async (skill, node) => {
    const res = await fetch("http://127.0.0.1:5000/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ skill, node })
    });
    const data = await res.json();
    setGame(data);

    const duration = data.skills[skill].job.duration;

    // Initialize timer for this specific node
    setTimers((prev) => ({
    ...prev,
    [skill]: { ...(prev[skill] || {}), [node]: duration },
  }));


    const interval = setInterval(() => {
    setTimers((prev) => {
      if (!prev[skill]?.[node]) {
        clearInterval(interval);
        return prev;
      }

      const timeLeft = prev[skill][node] - 1;

      if (timeLeft <= 0) {
        clearInterval(interval);
        finishJob(skill);

        // Remove this node timer safely
        const updatedSkillTimers = { ...prev[skill] };
        delete updatedSkillTimers[node];

        const newTimers = { ...prev };
        if (Object.keys(updatedSkillTimers).length > 0) {
          newTimers[skill] = updatedSkillTimers;
        } else {
          delete newTimers[skill];
        }

        return newTimers;
      }

      return {
        ...prev,
        [skill]: { ...prev[skill], [node]: timeLeft },
      };
    });
  }, 1000);
};

  // ----------------------------
  // Finish a job and update XP
  // ----------------------------
  const finishJob = async (skill) => {
    const res = await fetch("http://127.0.0.1:5000/finish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ skill })
    });
    await res.json();
    loadState();
  };

  // --- Render ---
  if (!game) return <div>Loading...</div>;

  // If no skill selected → show menu
  if (!currentSkill) {
    return (
      <div style={{ padding: 20 }}>
        <h1>Select a Skill</h1>
        <div className="button-grid">
          {Object.keys(game.skills).map((skill) => (
            <button 
              key={skill}
              onClick={() => setCurrentSkill(skill)}
              className="node-button"
             >
              {skill.charAt(0).toUpperCase() + skill.slice(1)}{' '}
              (Level {game.skills[skill].level})
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Skill selected → show nodes for that skill
  const skillNodes = nodes[currentSkill];
  const skillData = game.skills[currentSkill];

  return (
     <div style={{ padding: 20 }}>
      <button onClick={() => setCurrentSkill(null)}>← Back to Menu</button>
      <h1>
        {currentSkill.charAt(0).toUpperCase() + currentSkill.slice(1)}{" "}
        XP: {skillData.xp} | Level: {skillData.level}
      </h1>
    <div className="button-grid">
  {Object.entries(skillNodes)
    .sort((a, b) => a[1].xp - b[1].xp)
    .map(([nodeName, nodeData]) => (
      <div key={nodeName} className="node-wrapper">
        <button
          onClick={() => startJob(currentSkill, nodeName)}
          disabled={skillData.job !== null}
          className="node-button"
        >
          {currentSkill === "woodcutting" ? "Chop" : "Mine"} {nodeName}
        </button>

        {/* Progress bar */}
        {timers[currentSkill]?.[nodeName] != null && (
          <>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{
                width: `${((nodeData.time - timers[currentSkill][nodeName]) / nodeData.time) * 100}%`,
              }}
            ></div>
          </div>
          <div className="timer-text">{timers[currentSkill][nodeName]}s</div>
          </>
        )}
      </div>
    ))}
</div>
</div>
  );
}

export default App;
