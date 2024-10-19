import os
from pynput import keyboard
from dotenv import load_dotenv
import threading
import pyaudio
import time
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

def start_transcription():
    global transcription_active, dg_connection, audio_thread, exit_flag
    
    # Initialize Deepgram client and connection
    deepgram = DeepgramClient(API_KEY)
    dg_connection = deepgram.listen.websocket.v("1")
    
    # Set up event handlers
    def on_message(self, result, **kwargs):
        sentence = result.channel.alternatives[0].transcript
        if len(sentence) == 0:
            return
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
    
    # Initialize PyAudio and open stream
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
            {"role": "user", "content": f"Please convert the following transcription into structured steps:\n\n{transcription}"}
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
        
        # Clear the transcription file for the next session
        open("transcription.txt", "w").close()

def main():
    print("Press and hold the Option (Alt) key to start transcribing. Release to generate steps.")
    with keyboard.Listener(on_press=on_press, on_release=on_release) as listener:
        listener.join()

if __name__ == "__main__":
    main()