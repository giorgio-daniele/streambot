import subprocess
import time

bandwidth_rates  = [1500, 3000, 4500, 6000, 7500, 50000]
wondershaper     = "wondershaper/wondershaper"
password         = "user"
interface        = "enp1s0"

def run_command(command: list[str], password: str):
    process = subprocess.Popen(
        command, 
        stdin=subprocess.PIPE, 
        stdout=subprocess.PIPE, 
        stderr=subprocess.PIPE, 
        text=True
    )
    stdout, stderr = process.communicate(input=f"{password}\n")
    return stdout, stderr

def run_node_script(source_file: str):
    command = ["node", source_file]
    stdout, stderr = run_command(command, password)
    print(f"Running Node.js script {source_file}: {stdout}, {stderr}")

for rate in bandwidth_rates:
    command = [wondershaper, "-c", "-a", interface]
    stdout, stderr = run_command(command, password)
    print(f"Config removal for rate {rate}: {stdout}, {stderr}")

    command = [wondershaper, "-a", interface, "-u", str(rate), "-d", str(rate)]
    stdout, stderr = run_command(command, password)
    print(f"Setting new config for rate {rate}: {stdout}, {stderr}")

    run_node_script("source.js")

    print(f"Waiting for 5 seconds before setting the next rate...")
    time.sleep(5)

command = [wondershaper, "-ca", interface]
stdout, stderr = run_command(command, password)
print(f"Final config removal: {stdout}, {stderr}")
