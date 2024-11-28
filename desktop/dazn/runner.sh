#!/bin/bash

# List of bandwidth rates in Kbps
bandwidth_rates=(1500 3000 4500 6000 7500 50000)

# Define the path to wondersharper
wondershaper=wondershaper/wondershaper

# Define the network interface
interface=enp1s0

for rate in "${bandwidth_rates[@]}"; do

    # Invoke wondersharper to remove any previous configuration
    $wondersharper -ca $interface

    # Invoke wondersharper to set new bandwidth configuration
    $wondersharper -a $interface -u $rate -d $rate

    # Invoke Streambot here

done