import os
import yaml

BRANCH_NAME = os.environ.get("BRANCH_NAME", "main")
MKDOCS_FILE = "mkdocs.yml"
ARTICLE_PATH = "docs/articles/" + BRANCH_NAME + "/article.md"
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
# extra_css = config.get("extra_css", [])
# 
# extra_css = [
#     "stylesheets/extra-branch.css" if css == "stylesheets/extra.css" else css
#     for css in extra_css
# ]
# 
# config["extra_css"] = extra_css


# -------------------------------
# 2. Create a new nav for the branch
# -------------------------------
new_nav = [
    {"Home": "index.md"},
    {"Your work-in-progress Article": ARTICLE_PATH},
    {"DOCX version (for review only)": f"download/{BRANCH_NAME}.docx"},
    {"About us": "docs/about.md"}
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
---
hide:
  - toc
  - navigation
---

<div class="hero-section">
  <a href="https://hpe.com">
    <img class="hero-logo" src="images/mainlogo.png?sanitize=true" alt="HPE Juniper Techpost"/>
  </a>
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