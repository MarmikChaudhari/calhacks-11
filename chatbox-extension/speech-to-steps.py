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
import websockets
import asyncio

load_dotenv()

# Audio settings
FORMAT = pyaudio.paInt16
CHANNELS = 1
RATE = 16000
CHUNK = 1024

API_KEY = os.getenv("DG_API_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

# websocket communication
WS_HOST = 'localhost'
WS_PORT = 8765

transcription_active = False
dg_connection = None
audio_thread = None
exit_flag = None
current_websocket = None


# Constant for the JSON file path
STEPS_JSON_FILE = "vscode_steps.json"

def start_transcription():
    global transcription_active, dg_connection, audio_thread, exit_flag, current_websocket
    
    deepgram = DeepgramClient(API_KEY)
    dg_connection = deepgram.listen.websocket.v("1")
    
    def on_message(self, result, **kwargs):
        sentence = result.channel.alternatives[0].transcript
        if len(sentence) > 0:
            print(sentence, end=" ", flush=True)
            with open("transcription.txt", "a") as f:
                f.write(sentence + " ")
            # send realtime transcription to the websocket
            if current_websocket:
                asyncio.run(current_websocket.send(json.dumps({
                    "type": "transcription",
                    "content": sentence
                })))

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
            {"role": "user", "content": f"""Please convert the following transcription into structured steps for programming tasks. Classify/tag each step into one of these categories: 'system', 'code_generation', 'other'. If 'system', also specify the action from the following list: ('open', 'newFile', 'newFolder', 'rename', 'deleteFile', 'copyFile', 'moveFile', 'saveFile', 'saveAllFiles', 'compareFiles', 'edit', 'format', 'commentLine', 'uncommentLine', 'indentLine', 'outdentLine', 'renameSymbol', 'extractMethod', 'extractVariable', 'organizeImports', 'fixAll', 'goToDefinition', 'findReferences', 'goToLine', 'goToSymbol', 'goToFile', 'navigateBack', 'navigateForward', 'find', 'replace', 'findInFiles', 'replaceInFiles', 'splitEditorRight', 'splitEditorDown', 'closeEditor', 'closeAllEditors', 'focusNextEditor', 'focusPreviousEditor', 'toggleSidebar', 'togglePanel', 'toggleZenMode', 'toggleFullScreen', 'toggleMinimap', 'toggleWordWrap', 'openTerminal', 'run', 'runSelectedText', 'clearTerminal', 'killTerminal', 'gitStage', 'gitCommit', 'gitPush', 'gitPull', 'gitCheckoutBranch', 'gitCreateBranch', 'gitMerge', 'startDebugging', 'stopDebugging', 'toggleBreakpoint', 'stepOver', 'stepInto', 'stepOut', 'continue', 'foldAll', 'unfoldAll', 'foldLevel', 'installExtension', 'uninstallExtension', 'enableExtension', 'disableExtension', 'addFolder', 'removeFolder', 'openWorkspace', 'saveWorkspace', 'runTask', 'buildTask', 'testTask', 'openSettings', 'openKeybindings', 'showCommands', 'toggleOutputPanel', 'toggleProblemsPanel', 'changeLanguageMode'). 
             The output should be a list of steps with the following format: '1.[type][action] step_content'. Here is the transcription :\n\n{transcription}"""}
        ],
        max_tokens=1000
    )
    
    return response.choices[0].message.content

def on_press(key):
    global transcription_active
    if key == keyboard.Key.alt and not transcription_active:
        print("Starting transcription...")
        # Clear the transcription file when starting a new session
        open("transcription.txt", "w").close()
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
        
        parsed_steps = parse_classified_steps(structured_steps)
        save_steps_to_json(parsed_steps)

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
    
    return parsed_steps

def save_steps_to_json(parsed_steps):
    with open(STEPS_JSON_FILE, 'w') as json_file:
        json.dump(parsed_steps, json_file, indent=2)
    
    print(f"Steps have been saved to {STEPS_JSON_FILE}")


async def ws_server(websocket, path):
    global transcription_active, current_websocket
    current_websocket = websocket
    try:
        async for message in websocket:
            if message == "START":
                if not transcription_active:
                    print("Starting transcription...")
                    open("transcription.txt", "w").close()
                    start_transcription()
            elif message == "STOP":
                if transcription_active:
                    print("Stopping transcription and generating steps...")
                    stop_transcription()
                    
                    with open("transcription.txt", "r") as f:
                        transcription = f.read()
                    
                    structured_steps = generate_structured_steps(transcription)
                    parsed_steps = parse_classified_steps(structured_steps)
                    save_steps_to_json(parsed_steps)
                    
                    # Send the steps back to the VS Code extension
                    await websocket.send(json.dumps({
                        "type": "steps",
                        "content": parsed_steps
                    }))
    finally:
        if transcription_active:
            stop_transcription()
        current_websocket = None


async def main():
    server = await websockets.serve(ws_server, WS_HOST, WS_PORT)
    print(f"WebSocket server started on ws://{WS_HOST}:{WS_PORT}")
    await server.wait_closed()
    # print("Press and hold the Option (Alt) key to start transcribing. Release to generate steps.")
    # with keyboard.Listener(on_press=on_press, on_release=on_release) as listener:
    #     listener.join()

if __name__ == "__main__":
    asyncio.run(main())
