@echo off
if exist "venv\Scripts\activate.bat" (
    call venv\Scripts\activate.bat
    uvicorn app.main:app --reload
) else (
    echo Virtual environment not found. Please create it first:
    echo   python -m venv venv
    echo   venv\Scripts\activate
    echo   pip install -r requirements.txt
    python -m uvicorn app.main:app --reload
)


