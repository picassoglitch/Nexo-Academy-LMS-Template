from pydantic import EmailStr
import resend
from config.config import get_nexo_config


def send_email(to: EmailStr, subject: str, body: str):
    nexo_config = get_nexo_config()
    params = {
        "from": "Nexo Academy <" + nexo_config.mailing_config.system_email_address + ">",
        "to": [to],
        "subject": subject,
        "html": body,
    }

    resend.api_key = nexo_config.mailing_config.resend_api_key
    email = resend.Emails.send(params)

    return email
        
