from pathlib import Path

path = Path("frontend/live-page/app/admin/page.tsx")
lines = path.read_text(encoding="utf-8").splitlines()

target = '                <p className="text-sm text-slate-600">Encara no s\'ha emès cap alerta.</p>'
replacement = '                <p className="text-sm text-slate-600">Encara no s&apos;ha emès cap alerta.</p>'

for idx, line in enumerate(lines):
    if line == target:
        lines[idx] = replacement
        break
else:
    raise SystemExit("target not found")

path.write_text("\n".join(lines) + "\n", encoding="utf-8")
