import json
import logging
import re
import secrets
from smtplib import SMTPException
from datetime import timedelta

from django.contrib.auth import authenticate, get_user_model, login, logout
from django.contrib.auth.hashers import check_password, make_password
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.core.mail import send_mail
from django.db import DatabaseError, IntegrityError, transaction
from django.http import JsonResponse
from django.utils import timezone
from django.conf import settings
from django.views.decorators.csrf import csrf_exempt, ensure_csrf_cookie
from django.views.decorators.http import require_GET, require_POST

from authentication.models import PendingRegistration
from cart.models import Cart


CODE_TTL_SECONDS = 10 * 60
RESEND_COOLDOWN_SECONDS = 60
MAX_CODE_ATTEMPTS = 5
logger = logging.getLogger(__name__)


def _send_verification_code(email, code):
    send_mail(
        subject="Your M-3 Commerce verification code",
        message=f"Your M-3 Commerce verification code is {code}. It expires in 10 minutes.",
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[email],
        fail_silently=False,
    )


def _pending_registration(request):
    pending_id = request.session.get("pending_registration_id")
    if not pending_id:
        return None, None
    pending = PendingRegistration.objects.filter(pk=pending_id).first()
    if not pending:
        request.session.pop("pending_registration_id", None)
        return None, None
    return pending, pending


def _json_payload(request):
    try:
        payload = json.loads(request.body)
    except (json.JSONDecodeError, UnicodeDecodeError):
        return None, JsonResponse({"error": "Request body must be valid JSON."}, status=400)
    if not isinstance(payload, dict):
        return None, JsonResponse({"error": "Request body must be a JSON object."}, status=400)
    return payload, None


def _validated_email(raw_email):
    if not isinstance(raw_email, str) or not raw_email.strip():
        return None, "Enter your email address."

    email = raw_email.strip().lower()
    User = get_user_model()
    try:
        User._meta.get_field("email").clean(email, None)
        if len(email) > User._meta.get_field("username").max_length:
            return None, "Email addresses must be 150 characters or fewer."
    except ValidationError:
        return None, "Enter a valid email address."
    return email, None


def _email_exists(email):
    return (get_user_model().objects.filter(email__iexact=email).exists()
            or PendingRegistration.objects.filter(email__iexact=email).exists())


@csrf_exempt
@require_POST
def email_availability(request):
    payload, error_response = _json_payload(request)
    if error_response:
        return error_response

    email, error = _validated_email(payload.get("email"))
    if error:
        return JsonResponse({"errors": {"email": error}}, status=400)

    try:
        available = not _email_exists(email)
    except DatabaseError:
        return JsonResponse({"error": "Email availability could not be checked."}, status=503)
    return JsonResponse({"available": available})


@csrf_exempt
@require_POST
def register(request):
    payload, error_response = _json_payload(request)
    if error_response:
        return error_response

    raw_email = payload.get("email")
    password = payload.get("password")
    errors = {}
    User = get_user_model()
    email, email_error = _validated_email(raw_email)
    if email_error:
        errors["email"] = email_error

    if not isinstance(password, str) or not password:
        errors["password"] = "Enter a password."
    elif "email" not in errors:
        try:
            validate_password(password, User(email=email, username=email))
        except ValidationError as error:
            errors["password"] = " ".join(error.messages)

    if "email" not in errors:
        try:
            if User.objects.filter(email__iexact=email).exists():
                errors["email"] = "This email is already registered."
        except DatabaseError:
            return JsonResponse({"error": "Registration is temporarily unavailable."}, status=503)

    if errors:
        return JsonResponse({"errors": errors}, status=400)

    try:
        with transaction.atomic():
            code = f"{secrets.randbelow(1_000_000):06d}"
            now = timezone.now()
            pending = PendingRegistration.objects.create(
                email=email,
                password_hash=make_password(password),
                code_hash=make_password(code),
                expires_at=now + timedelta(seconds=CODE_TTL_SECONDS),
                last_sent_at=now,
            )
            _send_verification_code(email, code)
    except IntegrityError:
        return JsonResponse({"errors": {"email": "This email is already registered."}}, status=400)
    except (DatabaseError, OSError, SMTPException):
        return JsonResponse({"error": "Registration is temporarily unavailable."}, status=503)

    request.session["pending_registration_id"] = pending.pk
    return JsonResponse({"message": "Verification code sent.", "email": pending.email, "resend_after": RESEND_COOLDOWN_SECONDS}, status=202)


@csrf_exempt
@require_POST
def verify_registration(request):
    payload, error_response = _json_payload(request)
    if error_response:
        return error_response
    code = payload.get("code")
    if not isinstance(code, str) or not re.fullmatch(r"[0-9]{6}", code):
        return JsonResponse({"error": "Enter the six-digit code from your email."}, status=400)

    pending, verification = _pending_registration(request)
    if not pending:
        return JsonResponse({"error": "No pending registration was found. Please register again."}, status=400)
    now = timezone.now()
    if verification.expires_at <= now:
        return JsonResponse({"error": "That code has expired. Request a new code."}, status=400)
    if verification.attempts >= MAX_CODE_ATTEMPTS:
        return JsonResponse({"error": "Too many incorrect attempts. Request a new code."}, status=400)
    if not check_password(code, verification.code_hash):
        verification.attempts += 1
        verification.save(update_fields=["attempts"])
        if verification.attempts >= MAX_CODE_ATTEMPTS:
            return JsonResponse({"error": "Too many incorrect attempts. Request a new code."}, status=400)
        return JsonResponse({"error": "That code is incorrect. Please try again."}, status=400)

    User = get_user_model()
    try:
        with transaction.atomic():
            pending = PendingRegistration.objects.select_for_update().get(pk=pending.pk)
            if User.objects.filter(email__iexact=pending.email).exists():
                pending.delete()
                request.session.pop("pending_registration_id", None)
                return JsonResponse({"errors": {"email": "This email is already registered."}}, status=400)
            user = User(username=pending.email, email=pending.email, password=pending.password_hash, is_active=True)
            user.save(force_insert=True)
            Cart.objects.create(user=user)
            pending.delete()
    except DatabaseError as exc:
        if isinstance(exc, IntegrityError) and User.objects.filter(email__iexact=pending.email).exists():
            return JsonResponse({"errors": {"email": "This email is already registered."}}, status=400)
        logger.exception("Could not complete registration")
        return JsonResponse({"error": "Could not complete registration. Try verifying again."}, status=503)
    request.session.pop("pending_registration_id", None)
    login(request, user)
    return JsonResponse({"customer": {"email": user.email}})


@csrf_exempt
@require_POST
def resend_registration_code(request):
    pending, verification = _pending_registration(request)
    if not pending:
        return JsonResponse({"error": "No pending registration was found. Please register again."}, status=400)
    now = timezone.now()
    elapsed = (now - verification.last_sent_at).total_seconds()
    if elapsed < RESEND_COOLDOWN_SECONDS:
        wait_seconds = max(1, RESEND_COOLDOWN_SECONDS - int(elapsed))
        return JsonResponse({"error": "Please wait before requesting another code.", "resend_after": wait_seconds}, status=429)

    code = f"{secrets.randbelow(1_000_000):06d}"
    try:
        _send_verification_code(pending.email, code)
    except (OSError, SMTPException, DatabaseError):
        return JsonResponse({"error": "We could not send a new code. Please try again."}, status=503)
    verification.code_hash = make_password(code)
    verification.created_at = now
    verification.expires_at = now + timedelta(seconds=CODE_TTL_SECONDS)
    verification.last_sent_at = now
    verification.attempts = 0
    verification.save(update_fields=["code_hash", "created_at", "expires_at", "last_sent_at", "attempts"])
    return JsonResponse({"message": "Verification code sent.", "resend_after": RESEND_COOLDOWN_SECONDS})


@csrf_exempt
@require_POST
def cancel_registration(request):
    pending, _verification = _pending_registration(request)
    if pending:
        pending.delete()
    request.session.pop("pending_registration_id", None)
    return JsonResponse({"message": "Registration cancelled."})


@ensure_csrf_cookie
@require_GET
def current_customer(request):
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Not authenticated."}, status=401)
    return JsonResponse({"customer": {"email": request.user.email}})


@csrf_exempt
@require_POST
def customer_login(request):
    payload, error_response = _json_payload(request)
    if error_response:
        return error_response

    email = payload.get("email")
    password = payload.get("password")
    if not isinstance(email, str) or not email.strip() or not isinstance(password, str) or not password:
        return JsonResponse({"error": "Enter your email address and password."}, status=400)

    user = authenticate(request, username=email.strip().lower(), password=password)
    if user is None:
        return JsonResponse({"error": "Email or password is incorrect."}, status=401)
    login(request, user)
    return JsonResponse({"customer": {"email": user.email}})


@csrf_exempt
@require_POST
def customer_logout(request):
    logout(request)
    return JsonResponse({"message": "Logged out."})
