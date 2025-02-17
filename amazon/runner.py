import os
import time
import subprocess

PASSWORD = "C34B1bb22"
PAUSE    = 5
SHAPER   = "../macos-shaper"
LIMITS   = [1500, 3000, 4500, 6000, 7500, 50000]

def set_limit(limit: str):
    # Set the limit using background
    cmd = f"echo {PASSWORD} | sudo -Sk ./{SHAPER}/set.sh {limit} > /dev/null 2>&1"
    os.system(cmd)

def del_limit():
    # Del the limit using background
    cmd = f"echo {PASSWORD} | sudo -Sk ./{SHAPER}/del.sh  > /dev/null 2>&1"
    os.system(cmd)
    
def main():
   
    # Run the experiments
    for limit in LIMITS:
        print("Setting limit to", limit, "kbit/s")
        del_limit()
        set_limit(limit=str(limit))

        time.sleep(5)
        del_limit()

if __name__ == "__main__":
    main()