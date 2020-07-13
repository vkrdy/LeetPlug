from configparser import ConfigParser
import yagmail

class EmailHelper():
    def __init__(self, config: ConfigParser):
        config = config
        self.user = config['Gmail']['User']
        self.password = config['Gmail']['Password']

    def send(self, to: str, subject="", body="", html="") -> bool:
        with yagmail.SMTP(self.user, self.password) as yag:
            yag.send(to=to, subject=subject, contents=[body, html])
            return True
