import re
import os
from openai import OpenAI
from functools import lru_cache

# Initialize OpenAI client
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# Define regex patterns for common system actions
SYSTEM_ACTIONS = {
    'open': r'\b(open|view|display)\b',
    'create': r'\b(create|make|new)\b',
    'delete': r'\b(delete|remove|erase)\b',
    'rename': r'\b(rename|change\s+name)\b',
    'move': r'\b(move|relocate)\b',
    'edit': r'\b(edit|modify|change)\b',
    'run': r'\b(run|execute|start)\b',
    'stop': r'\b(stop|halt|terminate)\b',
    'install': r'\b(install|set\s+up)\b',
    'update': r'\b(update|upgrade)\b'
}

def identify_action_type(step):
    """
    Identify the action type of a given step using a hybrid approach.
    First tries regex matching, then falls back to LLM classification if needed.
    """
    # Check for system actions using regex
    for action, pattern in SYSTEM_ACTIONS.items():
        if re.search(pattern, step.lower()):
            return 'system', action

    # If no system action is identified, use LLM for classification
    return classify_with_llm(step)

@lru_cache(maxsize=100)
def classify_with_llm(step):
    """
    Classify the step using an LLM (GPT-3.5-turbo).
    Uses caching to improve performance for repeated or similar steps.
    """
    try:
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "Classify the following step into one of these categories: 'system', 'code_generation', 'other'. If 'system', also specify the action (open, create, delete, rename, move, edit, run, stop, install, update, or other)."},
                {"role": "user", "content": step}
            ],
            max_tokens=10
        )
        
        classification = response.choices[0].message.content.strip().lower()
        
        if 'system' in classification:
            # Extract the specific action if it's a system action
            action = re.search(r'system.*?(\w+)', classification)
            return 'system', action.group(1) if action else 'other'
        elif 'code_generation' in classification:
            return 'code_generation', None
        else:
            return 'other', None
    except Exception as e:
        print(f"Error in LLM classification: {e}")
        return 'other', None

def execute_steps(structured_steps):
    """
    Execute a series of structured steps.
    """
    steps = parse_steps(structured_steps)
    for step in steps:
        action_type, specific_action = identify_action_type(step)
        if action_type == 'system':
            execute_system_action(step, specific_action)
        elif action_type == 'code_generation':
            generated_code = generate_code(step)
            # Handle the generated code (e.g., save to file, display to user)
            print(f"Generated code for step: {step}")
            print(generated_code)
        else:
            print(f"Unhandled step type: {step}")

def execute_system_action(step, action):
    """
    Execute a system action based on the identified action type.
    """
    print(f"Executing system action: {action}")
    if action == 'open':
        # Logic to open a file or application
        pass
    elif action == 'create':
        # Logic to create a new file or directory
        pass
    elif action == 'delete':
        # Logic to delete a file or directory
        pass
    elif action == 'rename':
        # Logic to rename a file or directory
        pass
    elif action == 'move':
        # Logic to move a file or directory
        pass
    elif action == 'edit':
        # Logic to edit a file
        pass
    elif action == 'run':
        # Logic to run a script or application
        pass
    elif action == 'stop':
        # Logic to stop a running process
        pass
    elif action == 'install':
        # Logic to install a package or application
        pass
    elif action == 'update':
        # Logic to update a package or application
        pass
    else:
        print(f"Unhandled system action: {action}")

def generate_code(step):
    """
    Generate code based on the given step using an LLM.
    """
    try:
        response = client.chat.completions.create(
            model="gpt-4",  # Using GPT-4 for code generation
            messages=[
                {"role": "system", "content": "You are a helpful assistant that generates Python code based on instructions."},
                {"role": "user", "content": f"Generate Python code for the following instruction:\n\n{step}"}
            ],
            max_tokens=500
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        print(f"Error in code generation: {e}")
        return "# Error occurred during code generation"

def parse_steps(structured_steps):
    """
    Parse the structured steps into a list of individual steps.
    """
    # Split the steps into a list, assuming they're numbered
    steps = re.split(r'\d+\.\s+', structured_steps)[1:]
    return [step.strip() for step in steps]

# Example usage
if __name__ == "__main__":
    example_steps = """
    1. Open the file 'example.py' in the editor.
    2. Create a new function called 'process_data' that takes a list as an argument.
    3. In the function, calculate the average of the numbers in the list.
    4. Run the script to test the new function.
    5. If there are any errors, debug and fix them.
    """
    
    execute_steps(example_steps)