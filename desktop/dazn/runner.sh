#!/bin/bash

# List of bandwidth rates in Kbps
bandwidth_rates=(1500 3000 4500 6000 7500 50000)

# Define the path to wondersharper
wondershaper=wondershaper/wondershaper

# Insert the password here for enabling wondershaper
password=""

# Define the network interface
interface=enp1s0

for rate in "${bandwidth_rates[@]}"; do

    # Invoke wondersharper to remove any previous configuration
    echo "$password" | sudo -S -k "$wondershaper" -ca "$interface"

    # Invoke wondersharper to set new bandwidth configuration
    echo "$password" | sudo -S -k "$wondersharper" -a "$interface" -u "$rate" -d "$rate"

    # Invoke Streambot here
    # TODO

done

# Remove any previous configuration before exiting
echo "$password" | sudo -S -k "$wondershaper" -ca "$interface"