import os
import re
import json
import time
import pyaudio
import threading
from datetime import datetime
from functools import lru_cache
from pynput import keyboard
from dotenv import load_dotenv
from deepgram import DeepgramClient, LiveTranscriptionEvents, LiveOptions
from openai import OpenAI

load_dotenv()

# Audio settings
FORMAT = pyaudio.paInt16
CHANNELS = 1
RATE = 16000
CHUNK = 1024

API_KEY = os.getenv("DG_API_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

transcription_active = False
dg_connection = None
audio_thread = None
exit_flag = None

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

def start_transcription():
    global transcription_active, dg_connection, audio_thread, exit_flag
    
    deepgram = DeepgramClient(API_KEY)
    dg_connection = deepgram.listen.websocket.v("1")
    
    def on_message(self, result, **kwargs):
        sentence = result.channel.alternatives[0].transcript
        if len(sentence) > 0:
            print(sentence, end=" ", flush=True)
            with open("transcription.txt", "a") as f:
                f.write(sentence + " ")

    def on_metadata(self, metadata, **kwargs):
        print(f"\n\n{metadata}\n\n")

    def on_error(self, error, **kwargs):
        print(f"\n\n{error}\n\n")

    dg_connection.on(LiveTranscriptionEvents.Transcript, on_message)
    dg_connection.on(LiveTranscriptionEvents.Metadata, on_metadata)
    dg_connection.on(LiveTranscriptionEvents.Error, on_error)
    
    options = LiveOptions(
        model="nova-2", 
        language="en-US", 
        smart_format=True,
        encoding="linear16",
        sample_rate=RATE,
        channels=CHANNELS,
    )
    
    dg_connection.start(options)
    
    p = pyaudio.PyAudio()
    stream = p.open(format=FORMAT, channels=CHANNELS, rate=RATE, input=True, frames_per_buffer=CHUNK)
    
    exit_flag = threading.Event()
    
    def audio_stream():
        start_time = time.time()
        while not exit_flag.is_set():
            data = stream.read(CHUNK)
            try:
                dg_connection.send(data)
            except Exception as e:
                print(f"Error sending data: {e}")
                break
            
            if time.time() - start_time > 5:
                try:
                    dg_connection.keep_alive()
                    start_time = time.time()
                except Exception as e:
                    print(f"Error sending keep-alive: {e}")
                    break
    
    transcription_active = True
    audio_thread = threading.Thread(target=audio_stream)
    audio_thread.start()

def stop_transcription():
    global transcription_active, dg_connection, audio_thread, exit_flag
    
    transcription_active = False
    if exit_flag:
        exit_flag.set()
    if audio_thread:
        audio_thread.join()
    
    if dg_connection:
        dg_connection.finish()

def generate_structured_steps(transcription):
    client = OpenAI(api_key=OPENAI_API_KEY)
    
    response = client.chat.completions.create(
        model="gpt-4",
        messages=[
            {"role": "system", "content": "You are an AI assistant that converts transcriptions into structured steps."},
            {"role": "user", "content": f"""Please convert the following transcription into structured steps for programming tasks. Classify/tag each step into one of these categories: 'system', 'code_generation', 'other'. If 'system', also specify the action (open, create, delete, rename, move, edit, run, stop, install, update, or other). 
             The output should be a list of steps with the following format: '1.[type][action] step_content'. Here is the transcription :\n\n{transcription}"""}
        ],
        max_tokens=1000
    )
    
    return response.choices[0].message.content

def on_press(key):
    global transcription_active
    if key == keyboard.Key.alt and not transcription_active:
        print("Starting transcription...")
        start_transcription()

def on_release(key):
    global transcription_active
    if key == keyboard.Key.alt and transcription_active:
        print("Stopping transcription and generating steps...")
        stop_transcription()
        
        with open("transcription.txt", "r") as f:
            transcription = f.read()
        
        structured_steps = generate_structured_steps(transcription)
        print("Structured Steps:")
        print(structured_steps)
        
        execute_steps(structured_steps)
        
        # Clear the transcription file for the next session
        open("transcription.txt", "w").close()

def parse_classified_steps(structured_steps):
    # Split the steps, keeping the step numbers
    steps = re.split(r'(\d+\.)', structured_steps)[1:]  # Remove the first empty element
    
    parsed_steps = []
    for i in range(0, len(steps), 2):
        step_number = steps[i].strip()
        step_content = steps[i + 1].strip() if i + 1 < len(steps) else ""
        
        # Parse the step content
        match = re.match(r'\[(\w+)\](?:\[(\w+)\])?\s*(.*)', step_content, re.DOTALL)
        if match:
            step_type, action, content = match.groups()
            step_dict = {
                'content': content.strip(),
                'type': step_type.lower(),
                'action': action.lower() if action else None
            }
            parsed_steps.append(step_dict)
        else:
            # If the step doesn't match the expected format, treat it as 'other'
            parsed_steps.append({
                'content': step_content,
                'type': 'other',
                'action': None
            })

    # Save the parsed steps to a JSON file
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"steps_{timestamp}.json"
    
    with open(filename, 'w') as json_file:
        json.dump(parsed_steps, json_file, indent=2)
    
    print(f"Steps have been saved to {filename}")
    
    return parsed_steps

def execute_steps(structured_steps):
    steps = parse_classified_steps(structured_steps)
    for step in steps:
        action_type = step['type']
        if action_type == 'system':
            specific_action = step['action'] or 'other'
            execute_system_action(step['content'], specific_action)
        elif action_type == 'code_generation':
            generated_code = generate_code(step['content'])
            print(f"Generated code for step: {step['content']}")
            print(generated_code)
        else:
            print(f"Other step: {step['content']}")

def execute_system_action(step, action):
    print(f"Executing system action: {action}")
    # Implement the logic for each system action here
    if action == 'open':
        print(f"Opening: {step}")
        # TODO: Implement the logic to open a file or application
    elif action == 'create':
        print(f"Creating: {step}")
        # TODO: Implement the logic to create a file or application
    elif action == 'delete':
        print(f"Deleting: {step}")
        # TODO: Implement the logic to delete a file or application
    elif action == 'rename':
        print(f"Renaming: {step}")
    elif action == 'move':
        print(f"Moving: {step}")
    elif action == 'edit':
        print(f"Editing: {step}")
    elif action == 'run':
        print(f"Running: {step}")
    elif action == 'stop':
        print(f"Stopping: {step}")
    elif action == 'install':
        print(f"Installing: {step}")
    elif action == 'update':
        print(f"Updating: {step}")
    else:
        print(f"Other action: {action}, Step: {step}")

def generate_code(step):
    client = OpenAI(api_key=OPENAI_API_KEY)
    try:
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "You are a helpful assistant that generates code or makes relevant changes to files based on instructions."},
                {"role": "user", "content": f"Generate or make changes to code for the following instruction:\n\n{step}"}
            ],
            max_tokens=1500
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        print(f"Error in code generation: {e}")
        return "# Error occurred during code generation"

def main():
    print("Press and hold the Option (Alt) key to start transcribing. Release to generate steps.")
    with keyboard.Listener(on_press=on_press, on_release=on_release) as listener:
        listener.join()

if __name__ == "__main__":
    main()