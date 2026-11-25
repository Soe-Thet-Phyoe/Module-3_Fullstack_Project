from django.conf import settings
from django.db import models


class PendingRegistration(models.Model):
    email = models.EmailField(max_length=254, unique=True)
    password_hash = models.CharField(max_length=128)
    code_hash = models.CharField(max_length=128)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    last_sent_at = models.DateTimeField()
    attempts = models.PositiveSmallIntegerField(default=0)
