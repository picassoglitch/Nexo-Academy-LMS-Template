from fastapi import HTTPException
from config.config import get_nexo_config


def isDevModeEnabled():
    config = get_nexo_config()
    if config.general_config.development_mode:
        return True
    else:
        return False


def isDevModeEnabledOrRaise():
    config = get_nexo_config()
    if config.general_config.development_mode:
        return True
    else:
        raise HTTPException(status_code=403, detail="Development mode is disabled")
    

