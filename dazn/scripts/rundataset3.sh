#!/bin/bash

# Specify the path to your Python script
python_script="dataset3_runner.py"

# Run the Python script three times
for i in {1..30}
do
    echo "Running iteration $i"
    python3 $python_script
done
