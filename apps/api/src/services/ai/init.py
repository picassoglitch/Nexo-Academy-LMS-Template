from typing import Optional
from openai import OpenAI
from config.config import get_nexo_config

def get_openai_client() -> Optional[OpenAI]:
    """Get OpenAI client instance"""
    NEXO_CONFIG = get_nexo_config()
    api_key = getattr(NEXO_CONFIG.ai_config, 'openai_api_key', None)
    
    if not api_key:
        return None
        
    return OpenAI(api_key=api_key)