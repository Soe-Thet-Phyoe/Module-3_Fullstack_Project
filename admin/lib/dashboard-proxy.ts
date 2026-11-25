const base = (process.env.DJANGO_API_BASE_URL ?? "http://127.0.0.1:8000").replace(/\/$/, "");
const privateHeaders = { "Cache-Control": "private, no-store" };

export async function dashboardProxy(request: Request, path: string, service: string) {
  const headers = new Headers();
  const cookies = (request.headers.get("cookie") ?? "").split(";").map(value => value.trim());
  const forwarded = cookies.filter(value => value.startsWith("dashboard_session="));
  const csrf = cookies.find(value => value.startsWith("dashboard_csrf="));
  if (csrf) forwarded.push(csrf.replace(/^dashboard_csrf=/, "csrftoken="));
  if (forwarded.length) headers.set("Cookie", forwarded.join("; "));
  for (const name of ["Origin", "X-CSRFToken"]) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  try {
    const type = request.headers.get("content-type");
    let body;
    if (request.body) {
      if (type?.startsWith("multipart/form-data")) body = await request.formData();
      else {
        if (type) headers.set("Content-Type", type);
        body = await request.text();
      }
    }
    const upstream = await fetch(base + path, {
      method: request.method, headers, body, cache: "no-store", redirect: "error",
    });
    const result = new Headers(privateHeaders);
    const contentType = upstream.headers.get("content-type");
    if (contentType) result.set("Content-Type", contentType);
    for (const cookie of upstream.headers.getSetCookie()) {
      if (cookie.startsWith("dashboard_session=")) result.append("Set-Cookie", cookie);
      if (cookie.startsWith("csrftoken=")) result.append("Set-Cookie", cookie.replace(/^csrftoken=/, "dashboard_csrf="));
    }
    return new Response(upstream.body, { status: upstream.status, headers: result });
  } catch {
    return Response.json({ error: `The ${service} service is unavailable. Check that Django is running.` }, {
      status: 502, headers: privateHeaders,
    });
  }
}

