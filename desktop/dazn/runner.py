import subprocess

# List of bandwidth rates in Kbps
bandwidth_rates = [1500, 3000, 4500, 6000, 7500, 50000]

# Define the path to wondershaper
wondershaper = "wondershaper/wondershaper"

# Insert the password here for enabling wondershaper
password = "user"

# Define the network interface
interface = "enp1s0"

def run_command(command, password):
    process = subprocess.Popen(
        command, 
        stdin=subprocess.PIPE, 
        stdout=subprocess.PIPE, 
        stderr=subprocess.PIPE, 
        text=True
    )
    # Send password to stdin and return stdout, stderr
    stdout, stderr = process.communicate(input=f"{password}\n")
    return stdout, stderr

# Loop through each bandwidth rate
for rate in bandwidth_rates:
    
    # Invoke wondershaper to remove any previous configuration
    command = [wondershaper, "-c", "-a", interface]
    stdout, stderr = run_command(command, password)
    print(f"Config removal for rate {rate}: {stdout}, {stderr}")

    # Invoke wondershaper to set new bandwidth configuration
    command = [wondershaper, "-a", interface, "-u", str(rate), "-d", str(rate)]
    stdout, stderr = run_command(command, password)
    print(f"Setting new config for rate {rate}: {stdout}, {stderr}")

    # TODO: Add Streambot invocation here if needed

# Remove any previous configuration before exiting
command = [wondershaper, "-ca", interface]
stdout, stderr = run_command(command, password)
print(f"Final config removal: {stdout}, {stderr}")
