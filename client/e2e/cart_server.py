"""Start an isolated Django storefront fixture for the cart browser test."""
import os
import sys
from pathlib import Path
from tempfile import TemporaryDirectory

import django
from django.conf import settings
from django.core.management import call_command
from PIL import Image

client = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(client.parent / "server"))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "server.settings")

with TemporaryDirectory() as folder:
    settings.DATABASES = {"default": {"ENGINE": "django.db.backends.sqlite3", "NAME": Path(folder) / "cart.sqlite3"}}
    settings.EMAIL_BACKEND = "django.core.mail.backends.filebased.EmailBackend"
    settings.MEDIA_ROOT = Path(folder) / "media"
    settings.EMAIL_FILE_PATH = client / ".next" / "cart-test-mail"
    settings.CSRF_TRUSTED_ORIGINS = ["http://127.0.0.1:" + os.environ.get("CART_TEST_WEB_PORT", "3931")]
    django.setup()
    call_command("migrate", verbosity=0)
    from catalog.models import CategoryModel, ProductModel
    photo = Path("products/headphones.png")
    (settings.MEDIA_ROOT / photo).parent.mkdir(parents=True)
    Image.new("RGB", (64, 64), "blue").save(settings.MEDIA_ROOT / photo)
    audio = CategoryModel.objects.create(name="Audio")
    ProductModel.objects.create(title="Test headphones", price="125.50", quantity=4, image=photo.as_posix(), category=audio)
    ProductModel.objects.create(title="Test cable", price="5.00", quantity=1)
    call_command("runserver", "127.0.0.1:" + os.environ.get("CART_TEST_API_PORT", "8931"), use_reloader=False)

