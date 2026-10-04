"""Build assets/js/rgp-milestones-data.js for the timeline chart on rgp.html.

Papers are read automatically from publications.html, so after adding a new
paper there, just re-run:   python tools/build_milestones.py
Everything else (career, talks, funding, awards, editorial) is listed below --
add new items to the relevant list and re-run.

Dates are 'YYYY-MM' (or 'YYYY' when only the year is known).
"""
import html
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

MONTHS = {m: i for i, m in enumerate(
    "January February March April May June July August September October November December".split(), 1)}

# ---------------------------------------------------------------- career
# (start, end, title, detail) -- end None = ongoing
CAREER = [
    ("2004-10", "2007-09", "BSc, Summa cum Laude", "Molecular Biochemistry, Technion"),
    ("2007-10", "2010-09", "MSc, Summa cum Laude", "Technion, with Prof. Ehud Keinan"),
    ("2010-10", "2015-08", "PhD", "Technion, with Prof. Amnon Stanger"),
    ("2015-09", "2017-06", "Postdoctoral Researcher", "Group of Prof. Peter Chen, ETH Zürich"),
    ("2017-07", "2021-09", "Senior Scientist (Group Leader)", "Laboratory of Prof. Peter Chen, ETH Zürich"),
    ("2021-10", "2025-07", "Assistant Professor", "Schulich Faculty of Chemistry, Technion"),
    ("2025-08", None, "Associate Professor", "Schulich Faculty of Chemistry, Technion"),
]

# ---------------------------------------------------------------- talks
# (date, kind, event, place)   kind: Plenary | Invited | Award | Contributed | Seminar
TALKS = [
    ("2012", "Contributed", "Lise Meitner – Minerva Center for Computational Chemistry Symposium", "Jerusalem, Israel"),
    ("2014-12", "Contributed", "Schulich Graduate Students Symposium", "Haifa, Israel"),
    ("2017-06", "Contributed", "Gordon Research Conference on Physical Organic Chemistry (Poster Prize Talk)", "Holderness, NH, USA"),
    ("2018-07", "Contributed", "IUPAC International Conference on Physical Organic Chemistry (ICPOC)", "Faro, Portugal"),
    ("2018-05", "Contributed", "International Symposium on Reactive Intermediates and Unusual Molecules (ISRIUM)", "Monte Verità, Switzerland"),
    ("2018-11", "Invited", "Aromaticity 2018", "Riviera Maya, Mexico"),
    ("2019-09", "Invited", "International Conference on Excited State Aromaticity and Antiaromaticity", "Sigtuna, Sweden"),
    ("2022-07", "Invited", "WATOC, the 12th Triennial Congress", "Vancouver, Canada"),
    ("2022-09", "Invited", "The MAGIC Workshop", "Cambridge, UK"),
    ("2022-10", "Invited", "Batsheva de Rothschild Seminar on Strong Bond Activation", "Ein Gedi, Israel"),
    ("2022-12", "Invited", "2nd International Conference on Excited State Aromaticity and Antiaromaticity", "Hawaii, USA"),
    ("2023-05", "Invited", "The 3rd “Carbon” Fusion Conference", "Tulum, Mexico"),
    ("2023-05", "Invited", "SIMPLAIX Workshop on Machine Learning for Multiscale Molecular Modeling", "Heidelberg, Germany"),
    ("2023-06", "Invited", "Gordon Research Conference on Physical Organic Chemistry", "Holderness, NH, USA"),
    ("2023-09", "Invited", "European Symposium on Organic Reactivity (ESOR)", "Amsterdam, The Netherlands"),
    ("2023-11", "Invited", "Beilstein Symposium on Organic Chemistry", "Limburg, Germany"),
    ("2023-12", "Invited", "ELLIS ML4Molecules Workshop", "Online"),
    ("2024-01", "Invited", "10th Virtual Winter School of Computational Chemistry", "Online"),
    ("2024-05", "Invited", "Chemical Compound Space Conference", "Heidelberg, Germany"),
    ("2024-06", "Invited", "Challenges in Computational Homogeneous Catalysis (Chemistry@Sete)", "Sète, France"),
    ("2024-06", "Invited", "Gordon Research Conference: Crystal Engineering Meets AI", "Maine, USA"),
    ("2024-08", "Invited", "International Symposium on Novel Aromatics (ISNA 20)", "Toronto, Canada"),
    ("2024-09", "Invited", "Liebig College (Invited Visiting Lectureship)", "Giessen, Germany"),
    ("2025-01", "Invited", "Aromaticity 2025", "Mérida, Mexico"),
    ("2025-03", "Plenary", "The 37th Molecular Modelling Workshop", "Erlangen, Germany"),
    ("2025-08", "Award", "Academic Young Investigator Award Symposium, ACS Fall Meeting", "Washington, D.C., USA"),
    ("2025-09", "Invited", "ESOR 2025 – 20th European Symposium on Organic Reactivity", "Padova, Italy"),
    ("2025-09", "Invited", "Symposium on Frontiers in Organic Chemistry", "Coressia, Greece"),
    ("2025-12", "Invited", "Solvay Meeting – Aromaticity: Celebrating Benzene 200 Years", "Brussels, Belgium"),
    ("2026-02", "Plenary", "Israel Chemical Society 2026 Meeting", "Tel Aviv, Israel"),
    ("2026-03", "Invited", "George A. Olah Award in Hydrocarbon Chemistry Symposium, ACS Spring Meeting", "Atlanta, GA, USA"),
    ("2026-06", "Invited", "Reaction Mechanisms Conference", "Michigan, USA"),
    ("2026-09", "Invited", "CBOND 2026 – 5th European Symposium on Chemical Bonding", "Brussels, Belgium"),
    ("2026-11", "Invited", "AI Week 2026", "Tel Aviv University, Israel"),
    # invited department seminars (year only in CV)
    ("2019", "Seminar", "Vrije Universiteit Amsterdam", ""),
    ("2021", "Seminar", "Florida State University", "online"),
    ("2021", "Seminar", "Massachusetts Institute of Technology", "online"),
    ("2021", "Seminar", "Polish Academy of Sciences", "online"),
    ("2023", "Seminar", "ETH Zürich", ""),
    ("2023", "Seminar", "University of Helsinki", ""),
    ("2023", "Seminar", "University of Zurich", ""),
    ("2024", "Seminar", "Ben-Gurion University of the Negev", ""),
    ("2024", "Seminar", "Hebrew University of Jerusalem", ""),
    ("2024", "Seminar", "Stockholm University", ""),
    ("2024", "Seminar", "Uppsala University", ""),
    ("2024", "Seminar", "Justus Liebig University Giessen", ""),
    ("2024", "Seminar", "University of Regensburg", "online"),
    ("2025", "Seminar", "UC Berkeley", ""),
    ("2025", "Seminar", "University of Oregon, Eugene", ""),
    ("2025", "Seminar", "University of York", "online"),
    ("2025", "Seminar", "University of Regensburg", ""),
    ("2025", "Seminar", "Institute of Science and Technology Austria", ""),
    ("2025", "Seminar", "RSC Desktop Seminar – 200 Years of Benzene", "online"),
    ("2025", "Seminar", "Albert Ludwig University of Freiburg (Liebig Lectureship Tour)", ""),
    ("2025", "Seminar", "Justus Liebig University Giessen (Liebig Lectureship Tour)", ""),
    ("2025", "Seminar", "University of Münster (Liebig Lectureship Tour)", ""),
    ("2025", "Seminar", "Max Planck Institute, Mülheim an der Ruhr (Liebig Lectureship Tour)", ""),
    ("2025", "Seminar", "Chemnitz University of Technology (Liebig Lectureship Tour)", ""),
    ("2025", "Seminar", "University of Regensburg (Liebig Lectureship Tour)", ""),
    ("2025", "Seminar", "Ludwig Maximilian University of Munich (Liebig Lectureship Tour)", ""),
    ("2025", "Seminar", "Tel Aviv University", ""),
    ("2025", "Seminar", "Ariel University", ""),
    ("2026", "Seminar", "2nd Seminar of the European Committee of Chemical Bonding", "online"),
]

# ---------------------------------------------------------------- funding
# (date, end, title, detail, approx. size in USD -- only used for dot size)
FUNDING = [
    ("2007", "2009", "Schulich Fellowship for Excellence in Graduate Studies (MSc)", "Technion", 0),
    ("2012", "2014", "Schulich Fellowship for Excellence in Graduate Studies (PhD)", "Technion", 0),
    ("2016", "2018", "VATAT Fellowship for Excellent Female Postdoctoral Scholars", "Council for Higher Education, Israel", 0),
    ("2019-09", "2025", "Branco Weiss Fellowship – Society in Science", "500,000 CHF", 560000),
    ("2021", None, "Horev Fellowship – Leaders in Science and Technology", "Technion", 125000),  # size only; amount not shown
    ("2022", None, "Alon Scholarship – Integration of Outstanding Faculty", "Council for Higher Education, Israel", 125000),  # size only; amount not shown
    ("2023", "2027", "Israel Science Foundation – Personal Research Grant", "1,080,000 NIS", 290000),
    ("2023", "2027", "Israel Science Foundation – New Faculty Equipment Grant", "750,000 NIS", 200000),
    ("2026", "2028", "Petroleum Research Fund (ACS PRF)", "125,000 USD", 125000),
    ("2026", "2028", "Technion–GTIIT Seed Grant", "21,500 USD", 21500),
]

# ---------------------------------------------------------------- awards
# (date, title, detail, major?)
AWARDS = [
    ("2004", "President of the Technion's Award for Excellence in Studies", "5 semesters (top 3%)", False),
    ("2007", "Schulich Prize for Excellence in Undergraduate Studies", "", False),
    ("2007", "Knesset Award for Excellent Undergraduate Students", "", False),
    ("2008", "Vivian Konigsberg Award for Excellence in Teaching", "Technion", False),
    ("2009", "Schulich Prize for Excellence in Teaching", "Technion", False),
    ("2009", "Sandor Szego Award for Excellence in Teaching", "Technion", False),
    ("2010", "Sandor Szego Award for Excellence in Teaching", "Technion", False),
    ("2012", "Schulich Prize for Excellence in Teaching", "Technion", False),
    ("2013", "Sandor Szego Award for Excellence in Teaching", "Technion", False),
    ("2013-06", "Participant, 63rd Lindau Nobel Laureate Meeting (Chemistry)", "", False),
    ("2013", "Participant, 1st Global Young Scientists Summit", "Singapore", False),
    ("2014", "Schulich Prize for Excellence in Teaching", "Technion", False),
    ("2014", "Vivian Konigsberg Award for Continued Excellence in Teaching", "Technion", False),
    ("2015", "Weissman and Jacknow Prize for Continued Excellence in Teaching", "Technion", False),
    ("2017-06", "Poster Award, GRC Physical Organic Chemistry", "Poster chosen for talk", False),
    ("2018", "Junior Scientist Participation Award, 53rd Bürgenstock Conference", "", False),
    ("2021", "Golden Owl Award for Excellence in Teaching", "OC4: Molecular Orbital Theory, ETH Zürich", True),
    ("2021", "Horev Fellowship – Leaders in Science and Technology", "Technion", False),
    ("2022", "Alon Scholarship – Integration of Outstanding Faculty", "Council for Higher Education, Israel", False),
    ("2024", "Commendation for Excellence in Teaching", "Principles of Chemistry A, Technion", False),
    ("2024", "Krill Prize for Excellence in Scientific Research", "Wolf Foundation", True),
    ("2025", "Academic Young Investigator Award", "Division of Organic Chemistry, ACS and EuChemS", True),
    ("2025", "Liebig Lectureship Award", "Organic Chemistry Division, GDCh", True),
    ("2026", "Outstanding Young Scientist Award", "Israel Chemical Society", True),
]

# ---------------------------------------------------------------- editorial & community
# (date, end, title, detail)
SERVICE = [
    # (start, end, title, detail, major?)   end "now" = ongoing role
    ("2020", "now", "Editorial Advisory Board, ChemistryOpen", "", False),
    ("2021", "2022", "Co-editor, Rosarium Philosophorum on Computational Chemistry", "Israel Journal of Chemistry", False),
    ("2021", "2022", "Scientific Committee, European Young Chemists' Meeting 2022", "", False),
    ("2023", "2026", "Associate Editor, Journal of Physical Organic Chemistry", "", True),
    ("2023", "2024", "Co-editor, Special Issue on Excited State Aromaticity and Antiaromaticity", "Journal of Physical Organic Chemistry", False),
    ("2024-07", None, "Co-director, 3rd International Conference on Excited State Aromaticity and Antiaromaticity", "Croatia, July 2024", False),
    ("2024", "2025", "Co-editor, Prof. Dr. Peter Chen Festschrift", "Helvetica Chimica Acta", False),
    ("2025-07", None, "Co-organizer, Symposium in Honor of Prof. Dr. Peter Chen", "Zurich, July 2025", False),
    ("2025", "now", "Editorial Advisory Board, Journal of Computational Chemistry", "", False),
    ("2025", "now", "International Standing Committee, European Symposium on Organic Reactivity (ESOR)", "", False),
    ("2026", None, "Co-editor, Special Issue on Physical Organic Chemistry of Novel Aromatic Materials", "Beilstein Journal of Organic Chemistry", False),
    ("2026", None, "Co-editor, Special Issue on Excited State Aromaticity and Antiaromaticity", "Photochemical & Photobiological Sciences", False),
    ("2026", "now", "Topic Editor, Journal of the American Chemical Society", "", True),
]


def ym(s):
    """'YYYY' or 'YYYY-MM' -> [year, month, exact?]"""
    if s is None:
        return None
    p = s.split("-")
    return [int(p[0]), int(p[1]) if len(p) > 1 else 7, len(p) > 1]


def strip(s):
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", "", s))).strip()


def papers():
    src = (ROOT / "publications.html").read_text(encoding="utf8")
    out = []
    for it in re.split(r'<div class="publication-item', src)[1:]:
        year = int(re.search(r'data-year="(\d+)"', it).group(1))
        cat = html.unescape(re.search(r'data-category="([^"]+)"', it).group(1))
        typ = re.search(r'data-type="([^"]+)"', it).group(1)
        t = re.search(r'<h3 class="title">\s*<a href="([^"]*)"[^>]*>(.*?)</a>', it, re.S)
        pub = strip(re.search(r'class="publication">(.*?)</span>', it, re.S).group(1))
        month = next((MONTHS[w] for w in re.findall(r"[A-Z][a-z]+", pub) if w in MONTHS), 7)
        out.append({
            "lane": "papers",
            "start": [year, month, True],
            "title": strip(t.group(2)),
            "detail": pub,
            "url": t.group(1) or None,
            "cat": cat,
            "preprint": "preprint" in pub.lower(),
            "kind": typ,
        })
    return out


def build():
    ev = []
    for s, e, t, d in CAREER:
        ev.append({"lane": "career", "start": ym(s), "end": ym(e), "title": t, "detail": d})
    ev += papers()
    for s, k, t, p in TALKS:
        ev.append({"lane": "talks", "start": ym(s), "kind": k, "title": t, "detail": p})
    for s, e, t, d, usd in FUNDING:
        ev.append({"lane": "funding", "start": ym(s), "end": ym(e), "title": t, "detail": d, "usd": usd})
    for s, t, d, major in AWARDS:
        ev.append({"lane": "awards", "start": ym(s), "title": t, "detail": d, "major": major})
    for s, e, t, d, major in SERVICE:
        ev.append({"lane": "service", "start": ym(s), "end": None if e == "now" else ym(e),
                   "ongoing": e == "now", "title": t, "detail": d, "major": major})

    js = ("// Generated by tools/build_milestones.py -- edit that script, not this file.\n"
          "window.RGP_MILESTONES = " + json.dumps(ev, ensure_ascii=False, indent=1) + ";\n")
    out = ROOT / "assets" / "js" / "rgp-milestones-data.js"
    out.write_text(js, encoding="utf8")
    from collections import Counter
    print(out, Counter(e["lane"] for e in ev))


if __name__ == "__main__":
    build()
