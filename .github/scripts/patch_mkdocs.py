import os
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
    {"DOCX version (for review only)": f"download/{BRANCH_NAME}.docx"},
    {"About us": "about.md"}
    ]
config["nav"] = new_nav

# -------------------------------
# 3. Write back mkdocs.yml
# -------------------------------
with open(MKDOCS_FILE, "w") as f:
    yaml.dump(config, f, sort_keys=False)

print(f"mkdocs.yml patched for branch: {BRANCH_NAME}")

# Prepare WARNING message
banner = (
    '<p align="center">'
    '<img src="images/warn.gif" alt="Animated GIF" style="display: block; margin: 0 auto; width: 100px; height: auto;"><br>'
    f'<strong>THIS IS A WORK-IN-PROGRESS ARTICLE - BRANCH {BRANCH_NAME}</strong>'
    '</p>'
)

# Markdown template
index_md = f"""
<div class="hero-section">
  <a href="https://hpe.com" class="hero-wordmark" aria-label="HPE Juniper Techpost — home">
    <span class="hero-wordmark-eyebrow">HPE<span class="hero-wordmark-sep">×</span>Juniper</span>
    <span class="hero-wordmark-title">Techpost</span>
  </a>
  <p class="hero-topics">DC<span class="hero-topics-sep">·</span>AI<span class="hero-topics-sep">·</span>Routing<span class="hero-topics-sep">·</span>Switching<span class="hero-topics-sep">·</span>Security<span class="hero-topics-sep">·</span>Wireless<span class="hero-topics-sep">·</span>Automation</p>
  <p class="hero-subtitle">The HPE Juniper Engineering Technical Library</p>
  <p class="hero-description">In-depth technical articles written by engineers, for engineers.</p>
</div>
{banner}
"""

# Ensure docs directory exists
os.makedirs("docs", exist_ok=True)

# Write index.md
with open(INDEX_FILE, "w") as f:
    f.write(index_md)

print(f"docs/index.md generated for branch: {BRANCH_NAME}")