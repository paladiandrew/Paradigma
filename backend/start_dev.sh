#!/bin/bash

if [ -d "venv" ]; then
    source venv/bin/activate
    uvicorn app.main:app --reload
else
    echo "Virtual environment not found. Please create it first:"
    echo "  python -m venv venv"
    echo "  source venv/bin/activate"
    echo "  pip install -r requirements.txt"
    uvicorn app.main:app --reload
fi


