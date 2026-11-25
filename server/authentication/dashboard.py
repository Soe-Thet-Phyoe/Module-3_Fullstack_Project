import json
from functools import wraps

from django.conf import settings
from django.contrib.auth.hashers import check_password
from django.contrib.sessions.backends.db import SessionStore
from django.http import JsonResponse
from django.middleware.csrf import rotate_token
from django.utils.crypto import constant_time_compare, salted_hmac
from django.views.decorators.cache import never_cache
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.http import require_GET, require_POST

COOKIE = "dashboard_session"
SESSION_SECONDS = 8 * 60 * 60


def credential_version():
    return salted_hmac("dashboard.credentials", json.dumps([
        settings.DASHBOARD_ADMIN_USERNAME, settings.DASHBOARD_ADMIN_PASSWORD_HASH,
    ])).hexdigest()


def active_session(request):
    key = request.COOKIES.get(COOKIE)
    if key and settings.DASHBOARD_ADMIN_USERNAME and settings.DASHBOARD_ADMIN_PASSWORD_HASH:
        session = SessionStore(session_key=key)
        if constant_time_compare(session.get("dashboard_version", ""), credential_version()):
            return session
    return None


def dashboard_required(view):
    @never_cache
    @wraps(view)
    def protected(request, *args, **kwargs):
        if active_session(request) is None:
            return JsonResponse({"error": "Admin sign-in required."}, status=401)
        return view(request, *args, **kwargs)
    return protected


@never_cache
@ensure_csrf_cookie
@require_GET
def session_status(request):
    if active_session(request) is None:
        return JsonResponse({"authenticated": False})
    return JsonResponse({"authenticated": True, "username": settings.DASHBOARD_ADMIN_USERNAME})


@never_cache
@require_POST
def login(request):
    try:
        data = json.loads(request.body)
    except (ValueError, UnicodeDecodeError):
        data = None
    if not isinstance(data, dict):
        return JsonResponse({"error": "Enter a username and password."}, status=400)
    username, password = data.get("username"), data.get("password")
    if not (settings.DASHBOARD_ADMIN_USERNAME and settings.DASHBOARD_ADMIN_PASSWORD_HASH
            and isinstance(username, str) and isinstance(password, str)
            and check_password(password, settings.DASHBOARD_ADMIN_PASSWORD_HASH)
            and constant_time_compare(username, settings.DASHBOARD_ADMIN_USERNAME)):
        return JsonResponse({"error": "Invalid username or password."}, status=401)

    previous = active_session(request)
    session = SessionStore()
    session["dashboard_version"] = credential_version()
    session.set_expiry(SESSION_SECONDS)
    session.create()
    if previous is not None:
        previous.delete()
    rotate_token(request)
    response = JsonResponse({"authenticated": True})
    response.set_cookie(COOKIE, session.session_key, max_age=SESSION_SECONDS,
                        secure=settings.DASHBOARD_COOKIE_SECURE, httponly=True, samesite="Lax")
    return response


@never_cache
@require_POST
def logout(request):
    session = active_session(request)
    if session is not None:
        session.delete()
    response = JsonResponse({"authenticated": False})
    response.delete_cookie(COOKIE, samesite="Lax")
    return response

