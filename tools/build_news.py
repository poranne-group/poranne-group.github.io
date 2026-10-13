"""Build assets/js/news-data.js (the news strip on the home page).

Edit the NEWS list below and run:   python tools/build_news.py
Items are sorted newest first automatically.

Each item:  date "YYYY-MM" (or "YYYY"), type, short (1-3 words for the hexagon), title, text, link
type: paper | award | editorial | event | talk | people
  colours: awards & honors = award/editorial/event, papers = paper, talks = talk, group milestones = people
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

NEWS = [
    # ---------------------------------------------------------------- 2026
    ("2026-12", "event", "Frontiers of Science", "Renana invited to the Israeli-American Frontiers of Science Symposium",
     "Organized by the U.S. National Academy of Sciences and the Israel Academy of Sciences and Humanities, in Jerusalem.", "rgp.html"),
    ("2026-11", "talk", "AI Week 2026", "Renana speaks at AI Week 2026",
     "An invited talk at AI Week, Tel Aviv University.", "https://ai-week.com/"),
    ("2026-09", "people", "Well done, Taqwa!", "Taqwa completes her BSc project",
     "Congratulations to Taqwa on completing her BSc semester project in the group!", "people-alumni.html"),
    ("2026-08", "people", "Well done, Ruth!", "Ruth completes her BSc project",
     "Congratulations to Ruth on completing her BSc semester project in the group!", "people-alumni.html"),
    ("2026-09", "award", "CBOND Poster Prize", "Ajeet wins the Chemistry Poster Prize at CBOND 2026",
     "Congratulations to Ajeet on the poster prize at the 5th European Symposium on Chemical Bonding in Brussels!", "gallery.html"),
    ("2026-09", "people", "Itay's MSc!", "Itay receives his MSc!",
     "Congratulations to Itay on completing his MSc in the group.", "gallery.html"),
    ("2026-09", "people", "Farewell, Shabu", "Farewell, Shabu!",
     "After four years in the group, Shabu left us to go back home to India. We will miss him very much!", "people-alumni.html"),
    ("2026-09", "talk", "ICPOC27", "Renana speaks at ICPOC27 in Munich",
     "An invited talk at the 27th International Conference on Physical Organic Chemistry.", ""),
    ("2026-09", "talk", "CBOND 2026", "Renana speaks at CBOND 2026 in Brussels",
     "An invited talk at the 5th European Symposium on Chemical Bonding.", ""),
    ("2026-08", "paper", "Tripodal Rh ligand", "New paper in Chemistry – A European Journal",
     "Cationic Sulfonium-Based Tripodal Ligand and Its Rh(I) Complexes, together with the Tulchinsky group.", "https://doi.org/10.1002/chem.71052"),
    ("2026-07", "people", "Maisam & Maayan", "Maisam and Maayan complete their BSc projects",
     "Congratulations to Maisam and Maayan on completing their BSc semester projects, together with Computer Science!", "people-alumni.html"),
    ("2026-07", "paper", "Pentaleno­pentalenes", "Amrita's paper on pentalenopentalenes in Chemical Science",
     "Defying Antiaromaticity – The Curious Case of Pentalenopentalenes.", "https://doi.org/10.1039/d6sc02343f"),
    ("2026-06", "talk", "Reaction Mechanisms Conf.", "Renana speaks at the Reaction Mechanisms Conference",
     "An invited talk at the Reaction Mechanisms Conference in Michigan, USA.", ""),
    ("2026", "editorial", "JACS Topic Editor", "Renana appointed Topic Editor of the Journal of the American Chemical Society", "", "rgp.html"),
    ("2026", "award", "ICS Prize", "Renana receives the Israel Chemical Society Prize for Outstanding Young Investigator", "", "rgp.html"),
    ("2026-09", "paper", "Linearly Expanded Azulenes", "New paper in the Journal of Computational Chemistry",
     "Linearly Expanded Azulenes in the S0, T1, and Qu1 States: A Unified View of Electronic Structure and Aromaticity, by Pallavi and Itay.",
     "https://doi.org/10.1002/jcc.70504"),
    ("2026", "paper", "Three Wrongs", "New paper in Chemical Science",
     "Three Wrongs Make a Right: a Computational Investigation of [4n]–[4n]–[4n] Fused π-Systems.",
     "https://pubs.rsc.org/en/content/articlelanding/2026/sc/d5sc07395b"),
    ("2026-03", "paper", "Kumada coupling", "New paper in Angewandte Chemie",
     "Iron Catalyzed Aryl–Aryl Kumada Cross-Coupling: A Mechanistic and Computational Investigation, with the de Ruiter and Neidig groups.",
     "https://onlinelibrary.wiley.com/doi/10.1002/anie.3094782"),
    ("2026-03", "talk", "Olah Symposium", "Renana speaks at the George A. Olah Award Symposium",
     "An invited talk at the George A. Olah Award in Hydrocarbon Chemistry Symposium, ACS Spring Meeting.", ""),
    ("2026-02", "talk", "Plenary · ICS 2026", "Plenary lecture at the Israel Chemical Society Meeting",
     "Renana gave a plenary lecture at the 2026 Israel Chemical Society Meeting in Tel Aviv.", ""),
    # ---------------------------------------------------------------- 2025
    ("2025-12", "people", "Mazal Tov, Fatimah!", "Mazal Tov to Fatimah on the birth of Khaled!", "", ""),
    ("2025-12", "talk", "Solvay Workshop", "Renana speaks at the Solvay Workshop",
     "An invited talk at the Solvay Workshop – Aromaticity: Celebrating Benzene 200 Years, Brussels.", ""),
    ("2025-10", "people", "Welcome, Pallavi!", "Pallavi joins the group as a Lady Davis Postdoctoral Fellow", "", "people.html"),
    ("2025-10", "people", "Farewell, Kasia", "Farewell, Kasia!",
     "After more than three years in the group, Kasia left us to go back home. We miss her very much!", "people-alumni.html"),
    ("2025-09", "people", "Welcome, Ajeet!", "Ajeet joins the group as a postdoctoral researcher", "", "people.html"),
    ("2025-09", "paper", "Fe metathesis", "New paper in Angewandte Chemie",
     "Toward Iron-Catalyzed Alkene Metathesis: Mapping the Reactivity and Deactivation Pathways.",
     "https://onlinelibrary.wiley.com/doi/full/10.1002/anie.202515731"),
    ("2025-09", "talk", "ESOR 2025", "Renana speaks at ESOR 2025 in Padova",
     "An invited talk at the 20th European Symposium on Organic Reactivity.", ""),
    ("2025-08", "people", "Associate Professor", "Renana promoted to Associate Professor", "", "rgp.html"),
    ("2025-08", "award", "ACS Young Investigator", "Renana receives the Academic Young Investigator Award",
     "From the Division of Organic Chemistry of the ACS and EuChemS, with an award symposium at the ACS Fall Meeting in Washington, D.C.", "rgp.html"),
    ("2025-08", "paper", "Pyrene annelation", "New paper in the Journal of Organic Chemistry",
     "From Rings to Properties: Understanding the Effect of Annelation on Pyrene.", "https://pubs.acs.org/doi/10.1021/acs.joc.5c01401"),
    ("2025-07", "event", "Peter Chen Symposium", "Symposium in honor of Prof. Peter Chen",
     "Renana co-organized the symposium in honor of Prof. Dr. Peter Chen in Zurich.", "gallery.html"),
    ("2025", "award", "Liebig Lectureship", "Renana receives the Liebig Lectureship Award of the GDCh",
     "From the Organic Chemistry Division of the German Chemical Society, with a lecture tour across Germany.", "rgp.html"),
    ("2025-05", "paper", "Triquino­radialene", "New paper in Chemical Science",
     "Photoexcited and Ground-State Diradical(oid) Character in a Triquino[3]radialene.",
     "https://pubs.rsc.org/en/content/articlehtml/2025/sc/d5sc01676b"),
    ("2025-05", "paper", "COMPAS-4", "COMPAS-4 published in JCIM",
     "COMPAS-4: A Data Set of (BN)1 Substituted Cata-Condensed Polybenzenoid Hydrocarbons – Data Analysis and Feature Engineering.",
     "compas.html"),
    ("2025-04", "paper", "Magnetic locality", "New paper in the Journal of Chemical Physics",
     "How Local is 'Local'? Deep Learning Reveals Locality of the Induced Magnetic Field of Polycyclic Aromatic Hydrocarbons.",
     "https://pubs.aip.org/aip/jcp/article/162/14/144101/3342835/How-local-is-local-Deep-learning-reveals-locality"),
    ("2025-03", "talk", "Plenary · MMWS 2025", "Plenary lecture at the Molecular Modelling Workshop",
     "Renana gave a plenary lecture at the 37th Molecular Modelling Workshop in Erlangen.", ""),
    ("2025-02", "paper", "Quantum tunnelling", "New paper in Chemical Science",
     "Aromaticity Switching by Quantum Tunnelling, with the Kozuch group.", "https://pubs.rsc.org/en/content/articlehtml/2025/sc/d5sc05717e"),
    ("2025-02", "paper", "Mn-ketenimines", "New paper in Angewandte Chemie",
     "Manganese-Ketenimine Intermediates as Active Catalysts in the Michael Addition of Unactivated Nitriles.",
     "https://onlinelibrary.wiley.com/doi/full/10.1002/anie.202423275"),
    ("2025-01", "talk", "Aromaticity 2025", "Renana speaks at Aromaticity 2025 in Mérida",
     "An invited talk at Aromaticity 2025, Mexico.", ""),
    ("2025-01", "paper", "S1 PBHs", "New paper in the Journal of Physical Organic Chemistry",
     "Polybenzenoid Hydrocarbons in the S1 State: Simple Structural Motifs Predict Electronic Properties.",
     "https://onlinelibrary.wiley.com/doi/10.1002/poc.70012"),
    ("2025-01", "paper", "Doubly-reduced tetra­phenylene", "New paper in Chemistry – An Asian Journal",
     "Stabilizing Contorted Doubly-Reduced Tetraphenylene with Heavy Alkali Metal Complexation.",
     "https://aces.onlinelibrary.wiley.com/doi/full/10.1002/asia.202401498"),
    # ---------------------------------------------------------------- 2024
    ("2024-11", "people", "Welcome, Amrita!", "Amrita joins the group as a Maggie Kaplan Postdoctoral Fellow", "", "people.html"),
    ("2024-11", "paper", "Diradical character", "New paper in Physical Chemistry Chemical Physics",
     "Accelerated Diradical Character Assessment in Large Datasets of Polybenzenoid Hydrocarbons.",
     "https://pubs.rsc.org/en/content/articlelanding/2024/cp/d4cp04059g"),
    ("2024-11", "paper", "s-Indacenes", "New paper in Chemical Science",
     "Effects of Benzoheterocyclic Annelation on the s-Indacene Core: a Computational Analysis.",
     "https://pubs.rsc.org/en/content/articlelanding/2024/sc/d4sc06812b"),
    ("2024-09", "paper", "Co methyl migration", "New paper in JACS Au",
     "N2 Dissociation vs Reversible 1,2-Methyl Migration in PCNHCP Cobalt(I) Complexes.",
     "https://pubs.acs.org/doi/full/10.1021/jacsau.4c00529"),
    ("2024-09", "paper", "One more electron", "New paper in ChemistryEurope",
     "What a Difference an Electron Makes: Structural Response of Saddle-Shaped Tetraphenylene to Reduction.", "https://chemistry-europe.onlinelibrary.wiley.com/doi/10.1002/ceur.202400055"),
    ("2024-07", "event", "ICESAA3", "Renana co-directs ICESAA3 in Croatia",
     "The 3rd International Conference on Excited State Aromaticity and Antiaromaticity.", "gallery.html"),
    ("2024-07", "paper", "Hetero-PAS data", "New paper in the Beilstein Journal of Organic Chemistry",
     "Hetero-Polycyclic Aromatic Systems: A Data-Driven Investigation of Structure–Property Relationships.",
     "https://www.beilstein-journals.org/bjoc/articles/20/160"),
    ("2024-05", "paper", "COMPAS-3", "COMPAS-3 published in PCCP",
     "COMPAS-3: a Dataset of peri-Condensed Polybenzenoid Hydrocarbons.", "compas.html"),
    ("2024", "award", "Krill Prize", "Renana receives the Krill Prize from the Wolf Foundation",
     "The Krill Prize for Excellence in Scientific Research.", "rgp.html"),
    ("2024-01", "paper", "COMPAS-2", "COMPAS-2 published in Scientific Data",
     "COMPAS-2: a Dataset of cata-Condensed Hetero-Polycyclic Aromatic Systems.", "compas.html"),
    ("2024-01", "paper", "Expanded pentalenes", "New paper in Organic Letters",
     "Modulating Paratropicity in Heteroarene-Fused Expanded Pentalenes.", "https://pubs.acs.org/doi/full/10.1021/acs.orglett.4c00188"),
]


def sort_key(item):
    p = item[0].split("-")
    month = int(p[1]) if len(p) > 1 else 6.5          # year-only items sit mid-year
    return (int(p[0]), month)


def main():
    items = sorted(NEWS, key=sort_key, reverse=True)
    data = [dict(date=d, type=t, short=s, title=ti, text=tx, link=l) for d, t, s, ti, tx, l in items]
    out = ROOT / "assets" / "js" / "news-data.js"
    out.write_text("// Generated by tools/build_news.py -- edit the list there, not this file.\n"
                   "window.NEWS = " + json.dumps(data, indent=2, ensure_ascii=False) + ";\n", encoding="utf8")
    print(f"{len(data)} news items -> {out.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
