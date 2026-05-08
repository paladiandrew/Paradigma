from beanie import Document
from pydantic import Field

class About(Document):
    text: str = Field(default="Paradigma BJJ - это современная академия единоборств, где каждый может начать свой путь в удивительном мире боевых искусств.")
    
    class Settings:
        name = "about"
