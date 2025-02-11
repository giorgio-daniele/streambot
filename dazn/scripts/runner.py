import subprocess
import time

bandwidth_rates  = [1500, 3000, 4500, 6000, 7500, 50000]
wondershaper     = "wondershaper/wondershaper"
interface        = "enp1s0"

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

def run_node_script(source_file: str):
    print(f"Preparing to run Node.js script: {source_file}")
    command = ["node", source_file]
    stdout, stderr = run_command(command)
    print(f"Running Node.js script {source_file}: {stdout}, {stderr}")

for rate in bandwidth_rates:
    command = ["sudo", wondershaper, "-c", "-a", interface]
    stdout, stderr = run_command(command)
    print("Removing any limitation...")

    command = ["sudo", wondershaper, "-a", interface, "-u", str(rate), "-d", str(rate)]
    stdout, stderr = run_command(command)
    print("Adding limitation...")

    run_node_script("scraping.js")

    time.sleep(5)

command = ["sudo", wondershaper, "-c", "-a", interface]
stdout, stderr = run_command(command)
print("This is the end!")
