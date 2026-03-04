import json
import os
from pathlib import Path

# Path to store global weights
WEIGHTS_FILE = "global_weights.json"

def init_store():
    """
    Initialize the model store by creating global_weights.json if it doesn't exist.
    Sets initial round to 0 and weights to default values.
    """
    if not os.path.exists(WEIGHTS_FILE):
        initial_state = {
            "round": 0,
            "weights": {
                "w1": [0.0, 0.0, 0.0],
                "w2": [0.0, 0.0]
            }
        }
        with open(WEIGHTS_FILE, 'w') as f:
            json.dump(initial_state, f, indent=2)
        print(f"Created {WEIGHTS_FILE} with initial state")
    else:
        print(f"{WEIGHTS_FILE} already exists")

def get_global():
    """
    Read and return the current global model state.
    
    Returns:
        dict: Dictionary containing 'round' and 'weights'
    """
    if not os.path.exists(WEIGHTS_FILE):
        init_store()
    
    with open(WEIGHTS_FILE, 'r') as f:
        return json.load(f)

def update_global(new_weights):
    """
    Update the global model with new weights and increment the round counter.
    
    Args:
        new_weights (dict): Dictionary containing the new weights to update
    """
    current_state = get_global()
    
    # Increment round counter
    current_state["round"] += 1
    
    # Update weights
    current_state["weights"] = new_weights
    
    # Write back to file
    with open(WEIGHTS_FILE, 'w') as f:
        json.dump(current_state, f, indent=2)
    
    print(f"Updated global model to round {current_state['round']}")
    return current_state

def get_current_round():
    """
    Get the current round number.
    
    Returns:
        int: Current round number
    """
    state = get_global()
    return state["round"]

if __name__ == "__main__":
    # Quick test
    init_store()
    print("Current state:", get_global())
