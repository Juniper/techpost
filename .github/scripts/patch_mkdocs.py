import os
from urllib.parse import quote, urlsplit, urlunsplit

import yaml

BRANCH_NAME = os.environ.get("BRANCH_NAME", "main")
MKDOCS_FILE = "mkdocs.yml"
# Nav paths are relative to docs_dir and must include the .md extension so MkDocs
# can match the source page (otherwise the nav link is broken / points nowhere).
ARTICLE_PATH = "articles/" + BRANCH_NAME + "/article.md"
INDEX_FILE = "docs/index.md"

if BRANCH_NAME == "main":
    print("Branch is 'main'; no patching needed.")
    exit(0)
    
# -------------------------------
# Load mkdocs.yml
# -------------------------------
with open(MKDOCS_FILE, "r") as f:
    config = yaml.safe_load(f)

# The preview is published below gh-pages/<branch>/, so its canonical URL and
# custom site navigation must use that same path prefix.
site_url = config.get("site_url")
if not site_url:
    raise ValueError("mkdocs.yml must define site_url for branch previews.")
parsed_site_url = urlsplit(site_url)
if not parsed_site_url.scheme or not parsed_site_url.netloc:
    raise ValueError(f"Invalid site_url for branch preview: {site_url!r}")
branch_path = quote(BRANCH_NAME, safe="/-._~")
preview_path = f"{parsed_site_url.path.rstrip('/')}/{branch_path}/"
config["site_url"] = urlunsplit(
    (parsed_site_url.scheme, parsed_site_url.netloc, preview_path, "", "")
)

# -------------------------------
# 1. Switch extra.css for branches
# -------------------------------
extra_css = config.get("extra_css", [])

extra_css = [
    "stylesheets/extra-branch.css" if css == "stylesheets/extra.css" else css
    for css in extra_css
]

config["extra_css"] = extra_css


# -------------------------------
# 2. Create a new nav for the branch
# -------------------------------
new_nav = [
    {"Home": "index.md"},
    {"Your work-in-progress Article": ARTICLE_PATH},
]
config["nav"] = new_nav

# -------------------------------
# 3. Write back mkdocs.yml
# -------------------------------
with open(MKDOCS_FILE, "w") as f:
    yaml.dump(config, f, sort_keys=False)

print(f"mkdocs.yml patched for branch: {BRANCH_NAME}")
print(f"Branch preview base URL: {config['site_url']}")

# Prepare WARNING message
banner = (
    '<p align="center">'
    '<img src="images/warn.gif" alt="Animated GIF" style="display: block; margin: 0 auto; width: 100px; height: auto;"><br>'
    f'<strong>THIS IS A WORK-IN-PROGRESS ARTICLE - BRANCH {BRANCH_NAME}</strong>'
    '</p>'
)

# Markdown template
index_md = f"""
<div class="banner-section">
  <div class="banner-content">
    <p class="banner-eyebrow">HPE Networking Technical Library</p>
    <p class="banner-title">Engineering insights, built for networks</p>
    <p class="banner-description">In-depth technical articles written by engineers, for engineers. Explore expert perspectives on data center, AI, routing, switching, security, wireless &amp; automation.</p>
    <a href="articles/{BRANCH_NAME}/article/" class="banner-cta">Read the article</a>
    <div class="branch-downloads">
      <a href="download/{BRANCH_NAME}.pdf">Download PDF</a>
      <a href="download/{BRANCH_NAME}.epub">Download EPUB</a>
    </div>
  </div>
</div>
{banner}
"""

# Ensure docs directory exists
os.makedirs("docs", exist_ok=True)

# Write index.md
with open(INDEX_FILE, "w") as f:
    f.write(index_md)

print(f"docs/index.md generated for branch: {BRANCH_NAME}")