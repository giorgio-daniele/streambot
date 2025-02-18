import os
import time

PAUSE = 5
LIMITS = [1500, 3000, 4500, 6000, 7500, 50000]

def set_limit(limit: int):
    bin = "/home/giorgiodaniele/Desktop/streambot/node_modules/.bin/throttle"
    cmd = f"{bin} --up {limit} --down {limit}"
    os.system(cmd)

def del_limit():
    bin = "/home/giorgiodaniele/Desktop/streambot/node_modules/.bin/throttle"
    cmd = f"{bin} --stop"
    os.system(cmd)

def main():
    for limit in LIMITS:
        del_limit()
        set_limit(limit)
        time.sleep(60)

if __name__ == "__main__":
    main()
    del_limit()
