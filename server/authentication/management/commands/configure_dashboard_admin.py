import getpass
import os
import re
from pathlib import Path
from tempfile import NamedTemporaryFile

from django.conf import settings
from django.contrib.auth.hashers import make_password
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = "Set or rotate the fixed dashboard credentials in server/.env."

    def handle(self, *args, **options):
        username = input("Dashboard username: ").strip()
        if not re.fullmatch(r"[\w.@+-]{1,150}", username):
            raise CommandError("Use 1–150 letters, digits, or . @ + - _ for the username.")
        password = getpass.getpass("Dashboard password: ")
        if password != getpass.getpass("Confirm password: "):
            raise CommandError("Passwords do not match.")
        try:
            validate_password(password)
        except ValidationError as exc:
            raise CommandError(" ".join(exc.messages)) from exc

        path = Path(settings.BASE_DIR) / ".env"
        values = {"DASHBOARD_ADMIN_USERNAME": username, "DASHBOARD_ADMIN_PASSWORD_HASH": make_password(password)}
        lines = path.read_text(encoding="utf-8").splitlines() if path.exists() else []
        lines = [line for line in lines if line.partition("=")[0].strip() not in values]
        lines.extend(f"{key}={value}" for key, value in values.items())
        with NamedTemporaryFile(dir=path.parent, mode="w", encoding="utf-8", delete=False) as temp:
            temp_path = Path(temp.name)
        try:
            temp_path.write_text("\n".join(lines) + "\n", encoding="utf-8")
            os.replace(temp_path, path)
        finally:
            temp_path.unlink(missing_ok=True)
        self.stdout.write("Dashboard credentials saved. Restart Django to apply them.")

