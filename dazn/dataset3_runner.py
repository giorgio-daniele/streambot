import subprocess
import time
import threading

wondershaper = "wondershaper/wondershaper"
interface = "enp1s0"

def run_command(command: list[str]):
    print(f"Running command: [{' '.join(command)}]")
    process = subprocess.Popen(
        command, 
        stdout=subprocess.PIPE, 
        stderr=subprocess.PIPE, 
        text=True
    )
    stdout, stderr = process.communicate()
    print(f"Command output: {stdout}")
    if stderr:
        print(f"Command error: {stderr}")
    return stdout, stderr

def run_experiment(source_file: str):
    print(f"Preparing to run Node.js script: {source_file}")
    command = ["node", source_file]
    stdout, stderr = run_command(command)
    print(f"Running Node.js script {source_file}: {stdout}, {stderr}")

def add_bottleneck():
    print("Applying network bottleneck...")
    cmd = ["sudo", wondershaper, "-a", interface, "-d", "100", "-u", "100"]
    subprocess.Popen(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

def del_bottleneck():
    print("Removing network bottleneck...")
    cmd = ["sudo", wondershaper, "-c", "-a", interface]
    subprocess.Popen(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

def throttle():
    for i in range(5):
        print(f"Cycle {i+1} - Running at normal speed for 100 seconds...")
        time.sleep(100)  # Normal speed period
        
        add_bottleneck()
        print("Bottleneck applied for 20 seconds...")
        time.sleep(20)  # Bottleneck period
        
        del_bottleneck()
        print("Bottleneck removed.")

def main():
    # Clear any limitation before starting
    del_bottleneck()
    print("Removing any limitation...")

    # Run the supervised experiment in a separate thread
    t1 = threading.Thread(target=run_experiment, args=("scraping.js",))
    t1.start()
    
    # Start bottleneck process in the background
    t2 = threading.Thread(target=throttle, daemon=True)
    t2.start()
    
    # Keep the main process alive
    while threading.active_count() > 1:
        time.sleep(1)
    
    print("This is the end!")

if __name__ == "__main__":
    main()
