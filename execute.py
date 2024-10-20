import json
import subprocess

def execute_system_actions(json_input):
    if isinstance(json_input, str):
        # If input is a file path, read the JSON from the file
        with open(json_input, 'r') as file:
            steps = json.load(file)
    elif isinstance(json_input, list):
        # If input is already a JSON object
        steps = json_input
    else:
        raise ValueError("Input must be a JSON file path or a list of steps")

    for step in steps:
        action = step.get('action')
        content = step.get('content')
        step_type = step.get('type')

        if step_type == 'system' and action:
            print(f"Sending system action to VS Code: {action}")
            
            # Prepare the command data
            command_data = {
                "action": action,
                "step": content
            }
            
            # Convert the command data to a JSON string
            command_json = json.dumps(command_data)
            
            # Call the VS Code extension command
            try:
                result = subprocess.run(
                    ["code", "--extensionDevelopmentPath=path/to/your/extension", "--", "--executeCommand", command_json],
                    capture_output=True,
                    text=True,
                    check=True
                )
                print(f"VS Code action result: {result.stdout}")
            except subprocess.CalledProcessError as e:
                print(f"Error executing VS Code action: {e}")
                print(f"Error output: {e.stderr}")
        else:
            print(f"Skipping non-system step or step without action: {content}")

# Example usage
if __name__ == "__main__":
    # Example with JSON file
    execute_system_actions("steps_20241019_204924.json")
    
    # Example with JSON object
    steps_json = [
        {
            "content": "Open the file named \"main.py\".",
            "type": "system",
            "action": "open"
        },
        {
            "content": "Run the \"main.py\" file in the terminal.",
            "type": "system",
            "action": "run"
        }
    ]
    execute_system_actions(steps_json)