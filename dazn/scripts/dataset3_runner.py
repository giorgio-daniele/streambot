import subprocess
import time
import os
import multiprocessing

shaper = "/home/user/Desktop/streambot/shaper/wondershaper"
iface  = "enp1s0"

def run_command(command: list[str]):
    #print(f"Running command: [{' '.join(command)}]")
    process = subprocess.Popen(
        command, 
        stdout=subprocess.PIPE, 
        stderr=subprocess.PIPE, 
        text=True
    )
    stdout, stderr = process.communicate()
    if stderr:
        print(f"Command error: {stderr}")
    return stdout, stderr

def run_experiment(source_file: str):
    command = ["node", source_file]
    stdout, stderr = run_command(command)

def add_bottleneck():
    cmd = ["sudo", shaper, "-a", iface, "-d", "100", "-u", "100"]
    stdout, stderr = run_command(cmd)

def del_bottleneck():
    cmd = ["sudo", shaper, "-c", "-a", iface]
    stdout, stderr = run_command(cmd)
    
def throttle():
    for i in range(5):
        time.sleep(100)  
        print("Adding bottleneck...")
        add_bottleneck()
        time.sleep(25)  
        print("Removing bottleneck...")
        del_bottleneck()

def main():
    # Clear any limitation before starting
    del_bottleneck()

    # Start bottleneck process in the background using multiprocessing
    p = multiprocessing.Process(target=throttle)
    p.start()

    # Run the experiment
    run_experiment("scraping.js")
    
    # Keep the main process alive
    p.join()
    
    # Clear any limitation before starting
    del_bottleneck()

    print("END!")

if __name__ == "__main__":
    main()
