from flask import Flask, jsonify, request
from flask_cors import CORS
import json, time
from data import WOODCUTTING_NODES, MINING_NODES

app = Flask(__name__)
CORS(app)

SAVE_FILE = "saves.json"

def load():
    with open(SAVE_FILE) as f:
        return json.load(f)

def save(data):
    with open(SAVE_FILE, "w") as f:
        json.dump(data, f)

@app.route("/nodes")
def nodes():
    # Send available nodes to frontend
    return jsonify({"woodcutting": WOODCUTTING_NODES, "mining": MINING_NODES})

@app.route("/start", methods=["POST"])
def start():
    data = load()
    skill = request.json["skill"]
    node = request.json["node"]
    print(f'Data is {data}')
    print(f'Skill={skill}, Node={node}')
    

    # Prevent starting multiple jobs for same skill
    if data["skills"][skill]["job"] is not None:
        return jsonify({"error": "Job already running"}), 400

    # Lookup duration and XP from data.py
    node_data = WOODCUTTING_NODES.get(node) if skill == "woodcutting" else MINING_NODES.get(node)
    if not node_data:
        return jsonify({"error": "Node not found"}), 404

    # Start the job
    data["skills"][skill]["job"] = {
        "node": node,
        "started": time.time(),
        "duration": node_data["time"],
        "xp": node_data["xp"]  # store XP for reward
    }

    save(data)
    return jsonify(data)

@app.route("/finish", methods=["POST"])
def finish():
    data = load()
    skill = request.json["skill"]
    skill_data = data["skills"][skill]
    job = skill_data["job"]

    if not job:
        return jsonify({"error": "No job running"}), 400

    now = time.time()
    elapsed = now - job["started"]

    if elapsed >= job["duration"]:
        # Apply XP
        skill_data["xp"] += job["xp"]
        skill_data["job"] = None
        save(data)
        return jsonify({"message": f"{skill} job finished", "state": data})
    else:
        return jsonify({"message": "Job not finished yet", "time_left": job["duration"] - elapsed})

@app.route("/state")
def state():
    return jsonify(load())

if __name__ == "__main__":
    app.run(debug=True)
