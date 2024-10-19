# Example filename: main.py
import os
from dotenv import load_dotenv
import threading
import pyaudio
import time

from deepgram import (
    DeepgramClient,
    LiveTranscriptionEvents,
    LiveOptions,
)

load_dotenv()


# audio settings
FORMAT = pyaudio.paInt16
CHANNELS = 1
RATE = 16000
CHUNK = 1024

API_KEY = os.getenv("DG_API_KEY")

def main():
    try:
        # STEP 1: Create a Deepgram client using the API key
        deepgram = DeepgramClient(API_KEY)

        # STEP 2: Create a websocket connection to Deepgram
        dg_connection = deepgram.listen.websocket.v("1")

        # STEP 3: Define the event handlers for the connection
        def on_message(self, result, **kwargs):
            sentence = result.channel.alternatives[0].transcript
            if len(sentence) == 0:
                return
            print(f"speaker: {sentence}")

        def on_metadata(self, metadata, **kwargs):
            print(f"\n\n{metadata}\n\n")

        def on_error(self, error, **kwargs):
            print(f"\n\n{error}\n\n")

        # STEP 4: Register the event handlers
        dg_connection.on(LiveTranscriptionEvents.Transcript, on_message)
        dg_connection.on(LiveTranscriptionEvents.Metadata, on_metadata)
        dg_connection.on(LiveTranscriptionEvents.Error, on_error)

        # STEP 5: Configure Deepgram options for live transcription
        options = LiveOptions(
            model="nova-2", 
            language="en-US", 
            smart_format=True,
            encoding="linear16",
            sample_rate=RATE,
            channels=CHANNELS,
            ) # model settings
        
        # STEP 6: Start the connection
        dg_connection.start(options)

        # STEP 7: Create a flag for thread synchronization
        exit_flag = threading.Event()

        # STEP 8 : initialize pyaudio
        p = pyaudio.PyAudio()

        # STEP 9 : open stream
        stream = p.open(format=FORMAT,
                        channels=CHANNELS,
                        rate=RATE,
                        input=True,
                        frames_per_buffer=CHUNK)
        
        print("Recording...")

        # STEP 10 : define a thread that streams the audio from microphone and sends it to Deepgram
        def audio_stream():
            start_time = time.time()
            while not exit_flag.is_set():
                data = stream.read(CHUNK)
                try:
                    dg_connection.send(data)
                except Exception as e:
                    print(f"Error sending data: {e}")
                    break
                
                # Send a keep-alive message every 5 seconds
                if time.time() - start_time > 5:
                    try:
                        dg_connection.keep_alive()
                        start_time = time.time()
                    except Exception as e:
                        print(f"Error sending keep-alive: {e}")
                        break

        # STEP 11 : start the thread
        audio_thread = threading.Thread(target=audio_stream)
        audio_thread.start()

        # STEP 12 : wait for user input to stop recording
        input("Press Enter to stop recording...\n\n")

        # STEP 13 : set the exit flag to True to stop the thread
        exit_flag.set()

        # STEP 14: Wait for the thread to finish
        audio_thread.join()

        # STEP 15: stop and close the stream
        stream.stop_stream()
        stream.close()

        # STEP 16: close pyaudio
        p.terminate()

        # STEP 17: Send close stream message to Deepgram
        dg_connection.finish()

        print("Finished")

    except Exception as e:
        print(f"Could not open socket: {e}")
        return


if __name__ == "__main__":
    main()