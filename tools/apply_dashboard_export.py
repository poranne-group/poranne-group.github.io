"""Put suggestions approved in the group dashboard (Review tab) on the website.

In the dashboard's Review tab, click "Download approved for website". That saves
dashboard_export_<date>.json (usually in Downloads). Then run:
    python tools/apply_dashboard_export.py

Looks for dashboard_export*.json in Downloads, Documents, Desktop and the website folder,
applies them oldest first, and renames each one to *.applied.json when done:
    news        -> added to the NEWS list in tools/build_news.py, then the news is rebuilt
    photo tags  -> photo_gallery/photo_details_edits.json, then the gallery is rebuilt
                   (build_gallery.py moves them into photo_details.xlsx)
    profiles    -> the public fields (bio, interests, links, and the email if they chose to show it)
                   go into tools/people_profiles.json and assets/js/people-profiles-data.js, which the
                   People pages show when a card with data-profile="<slug>" is clicked; everything
                   they sent (incl. name, title and notes) is also logged in profile_updates.md (not published)
Nothing is committed: look over the changes, then commit and push as usual.
"""
import json
import re
import subprocess
import sys
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_gallery import CONFIG, GAL, photos_in, web_name  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
NEWS_SCRIPT = ROOT / "tools" / "build_news.py"
EDITS = GAL / "photo_details_edits.json"
PROFILES = ROOT / "profile_updates.md"
PROFILE_DATA = ROOT / "tools" / "people_profiles.json"
PROFILE_JS = ROOT / "assets" / "js" / "people-profiles-data.js"
PUBLIC_FIELDS = ["bio", "interests", "nowAt", "scholar", "orcid", "linkedin", "github", "website"]
PEOPLE_PAGES = [ROOT / "people.html", ROOT / "people-alumni.html"]
NEWS_TYPES = {"paper", "award", "editorial", "event", "talk", "people"}
PROFILE_LABELS = [
    ("displayName", "Name"), ("position", "Position"), ("email", "Email"), ("showEmail", "Show email on website"),
    ("bio", "Bio"), ("interests", "Research interests"), ("website", "Website"), ("scholar", "Google Scholar"),
    ("orcid", "ORCID"), ("linkedin", "LinkedIn"), ("github", "GitHub"), ("nowAt", "Now at"), ("notes", "Notes"),
]


def find_exports():
    places = [Path.home() / "Downloads", Path.home() / "Documents", Path.home() / "Desktop", ROOT]
    found = {f.resolve() for d in places if d.exists() for f in d.glob("dashboard_export*.json")
             if not f.name.endswith(".applied.json")}
    return sorted(found, key=lambda f: f.stat().st_mtime)


# ---------------------------------------------------------------- news
def py_str(s):
    return json.dumps(str(s or ""), ensure_ascii=False)       # a JSON string is a valid Python string


def add_news(items, stamp):
    if not items:
        return 0
    text = NEWS_SCRIPT.read_text(encoding="utf8")
    lines = []
    for n in items:
        title = (n.get("title") or "").strip()
        if not title or py_str(title) in text:
            print(f"  news: skipped (empty or already there): {title!r}")
            continue
        kind = n.get("type") if n.get("type") in NEWS_TYPES else "event"
        short = (n.get("short") or "").strip() or " ".join(title.split()[:3])
        lines.append(f"    ({py_str(n.get('date'))}, {py_str(kind)}, {py_str(short)}, {py_str(title)},\n"
                     f"     {py_str(n.get('text'))}, {py_str(n.get('link'))}),\n")
        print(f"  news: {n.get('date')} {title}  (from {n.get('from', '?')})")
    if lines:
        head = "NEWS = [\n"
        block = f"    # ---------------------------------------------------------------- from the dashboard ({stamp})\n"
        text = text.replace(head, head + block + "".join(lines), 1)
        NEWS_SCRIPT.write_text(text, encoding="utf8")
    return len(lines)


# ---------------------------------------------------------------- photo tags
def web_to_original():
    """photo_gallery/web/<folder>/<web name> -> original photo name, for every album folder."""
    albums = json.loads(CONFIG.read_text(encoding="utf8")).get("albums", [])
    out = {}
    for a in albums:
        for folder in a.get("folders") or [a.get("folder")]:
            if folder:
                for p in photos_in(GAL / folder):
                    out[f"photo_gallery/web/{folder.lower()}/{web_name(p)}"] = p.name
    return out


def add_photo_tags(tags):
    if not tags:
        return 0
    names = web_to_original()
    edits = json.loads(EDITS.read_text(encoding="utf8")) if EDITS.exists() else {}
    n = 0
    for web, fields in tags.items():
        name = names.get(web)
        if not name:
            print(f"  photo: !! not found in the gallery any more, skipped: {web}")
            continue
        edits.setdefault(name, {}).update({k: v for k, v in fields.items() if k in ("event", "date", "place", "people", "note")})
        print(f"  photo: {name}: " + "; ".join(f"{k} = {v}" for k, v in fields.items()))
        n += 1
    EDITS.write_text(json.dumps(edits, indent=2, ensure_ascii=False), encoding="utf8")
    return n


# ---------------------------------------------------------------- profiles
def add_profiles(profiles, stamp):
    if not profiles:
        return 0
    parts = [] if PROFILES.exists() else [
        "# Profile updates from the dashboard\n\n"
        "Approved in the dashboard; apply them to people.html / people-alumni.html (or ask Claude to),\n"
        "then delete the entry. This file is not published.\n"]
    for p in profiles:
        rows = []
        for key, label in PROFILE_LABELS:
            v = p.get(key)
            if key == "showEmail":
                v = "yes" if v else "no"
            if v:
                rows.append(f"- **{label}:** " + str(v).replace("\n", "\n  "))
        parts.append(f"\n## {p.get('from', '?')} ({p.get('account', '')}), sent {p.get('sentAt', '')}, exported {stamp}\n\n"
                     + "\n".join(rows) + "\n")
        print(f"  profile: {p.get('from', '?')}")
    with PROFILES.open("a", encoding="utf8") as f:
        f.write("".join(parts))
    publish_profiles(profiles)
    return len(profiles)


def publish_profiles(profiles):
    data = json.loads(PROFILE_DATA.read_text(encoding="utf8")) if PROFILE_DATA.exists() else {}
    pages = "".join(pg.read_text(encoding="utf8") for pg in PEOPLE_PAGES if pg.exists())
    for p in profiles:
        slug = p.get("slug") or p.get("from", "").lower()
        entry = {k: str(p[k]).strip() for k in PUBLIC_FIELDS if str(p.get(k) or "").strip()}
        if p.get("showEmail") and p.get("email"):
            entry["email"] = p["email"].strip()
        data[slug] = entry
        if f'data-profile="{slug}"' not in pages:
            print(f'  profile: !! no card has data-profile="{slug}" yet -- add it to their card on the People page')
    write_profile_js(data)


def write_profile_js(data):
    PROFILE_DATA.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf8")
    PROFILE_JS.write_text("// Generated by tools/apply_dashboard_export.py from tools/people_profiles.json -- edit that, not this.\n"
                          "window.PEOPLE_PROFILES = " + json.dumps(data, indent=2, ensure_ascii=False) + ";\n",
                          encoding="utf8")
    for page in PEOPLE_PAGES:                     # version stamp so browsers don't show a cached copy
        if page.exists():
            text = page.read_text(encoding="utf8")
            stamp = str(int(PROFILE_JS.stat().st_mtime))
            new = re.sub(r'assets/js/people-profiles-data\.js(\?v=\d+)?"', f'assets/js/people-profiles-data.js?v={stamp}"', text)
            if new != text:
                page.write_text(new, encoding="utf8")


def main():
    exports = find_exports()
    if not exports:
        print("No dashboard_export*.json found in Downloads, Documents, Desktop or the website folder.")
        return
    totals = {"news": 0, "photos": 0, "profiles": 0}
    for f in exports:
        data = json.loads(f.read_text(encoding="utf8"))
        stamp = (data.get("exportedAt") or date.today().isoformat())[:10]
        print(f"Applying {f}")
        totals["news"] += add_news(data.get("news", []), stamp)
        totals["photos"] += add_photo_tags(data.get("photoTags", {}))
        totals["profiles"] += add_profiles(data.get("profiles", []), stamp)
        done, n = f.with_name(f.stem + ".applied.json"), 2
        while done.exists():                              # e.g. a second export on the same day
            done, n = f.with_name(f"{f.stem}.applied-{n}.json"), n + 1
        f.rename(done)

    if totals["news"]:
        subprocess.run([sys.executable, str(ROOT / "tools" / "build_news.py")], check=True)
    if totals["photos"]:
        subprocess.run([sys.executable, str(ROOT / "tools" / "build_gallery.py")], check=True)
    print(f"\nDone: {totals['news']} news items, {totals['photos']} photos, {totals['profiles']} profiles.")
    if totals["profiles"]:
        print(f"Profiles are on the People pages; everything they sent is logged in {PROFILES.name}.")
    print("Nothing is committed yet: check the changes, then commit and push.")


if __name__ == "__main__":
    main()
