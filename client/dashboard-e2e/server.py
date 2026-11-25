import os
import sys
from pathlib import Path
from tempfile import TemporaryDirectory

import django
from django.conf import settings
from django.contrib.auth.hashers import make_password
from django.core.management import call_command

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "server"))
os.environ["DJANGO_SETTINGS_MODULE"] = "server.settings"
with TemporaryDirectory() as folder:
    settings.DATABASES = {"default": {"ENGINE": "django.db.backends.sqlite3", "NAME": Path(folder) / "test.sqlite3"}}
    settings.DASHBOARD_ADMIN_USERNAME = "browser-operator"
    settings.DASHBOARD_ADMIN_PASSWORD_HASH = make_password("browser-only-passphrase")
    settings.CSRF_TRUSTED_ORIGINS = ["http://127.0.0.1:3932"]
    django.setup()
    call_command("migrate", verbosity=0)
    call_command("runserver", "127.0.0.1:8932", use_reloader=False)

