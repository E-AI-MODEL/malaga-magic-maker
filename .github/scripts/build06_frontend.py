from pathlib import Path
import re
import shutil

root = Path.cwd()

copies = {
    root / ".build06/access.ts": root / "src/config/access.ts",
    root / ".build06/auth.tsx": root / "src/lib/auth.tsx",
    root / ".build06/Login.tsx": root / "src/pages/Login.tsx",
    root / ".build06/JoinTrip.tsx": root / "src/pages/JoinTrip.tsx",
}

for source, target in copies.items():
    if not source.exists():
        raise SystemExit(f"missing template: {source}")
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(source, target)

client_path = root / "src/integrations/supabase/client.ts"
client = client_path.read_text()
if "./database-build06" not in client:
    updated = client.replace("from './database';", "from './database-build06';")
    updated = updated.replace('from "./database";', 'from "./database-build06";')
    if updated == client:
        raise SystemExit("could not find Database import in client.ts")
    client_path.write_text(updated)

app_path = root / "src/App.tsx"
app = app_path.read_text()
if 'const Signup = lazy(() => import("./pages/Signup"));' not in app:
    marker = "// Lazy-loaded pages\n"
    if marker not in app:
        raise SystemExit("App.tsx lazy-page marker missing")
    app = app.replace(
        marker,
        marker
        + 'const Signup = lazy(() => import("./pages/Signup"));\n'
        + 'const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));\n'
        + 'const ResetPassword = lazy(() => import("./pages/ResetPassword"));\n',
        1,
    )

app = app.replace('/join/:inviteCode', '/join/:inviteToken')

if 'path="/signup"' not in app:
    match = re.search(r'(?m)^(\s*<Route path="/login"[^\n]*\n)', app)
    if not match:
        raise SystemExit("App.tsx login route missing")
    routes = (
        f'{match.group(1)}'
        '        <Route path="/signup" element={<Signup />} />\n'
        '        <Route path="/forgot-password" element={<ForgotPassword />} />\n'
        '        <Route path="/reset-password" element={<ResetPassword />} />\n'
    )
    app = app[:match.start()] + routes + app[match.end():]

app_path.write_text(app)

settings_path = root / "src/pages/TripSettings.tsx"
settings = settings_path.read_text()
invite_import = 'import { TripInvitesCard } from "@/features/invites/TripInvitesCard";\n'
if invite_import not in settings:
    imports_end = settings.find("\n\n")
    if imports_end == -1:
        raise SystemExit("TripSettings import block not found")
    settings = settings[:imports_end + 1] + invite_import + settings[imports_end + 1:]

if "<TripInvitesCard tripId={activeTrip.id} />" not in settings:
    marker = "\n      </div>\n    </AppLayout>"
    if marker not in settings:
        raise SystemExit("TripSettings outer container marker missing")
    block = (
        "\n        <div className=\"mt-8\">\n"
        "          <TripInvitesCard tripId={activeTrip.id} />\n"
        "        </div>"
    )
    settings = settings.replace(marker, block + marker, 1)

settings_path.write_text(settings)

shutil.rmtree(root / ".build06")
