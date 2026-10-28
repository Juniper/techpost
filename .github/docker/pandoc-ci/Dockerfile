# CI image for deploy.yml: Python 3.12 + Pandoc + TeX Live + poppler, with the
# repo's Pandoc templates pre-installed. Built by build-pandoc-image.yml and
# published to ghcr.io/juniper/techpost/pandoc-ci. Build context = repo root.
FROM python:3.12-slim-bookworm

ARG PANDOC_VERSION=3.5
ENV DEBIAN_FRONTEND=noninteractive \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# git is needed by actions/checkout and the gh-pages steps; nodejs backs markdown-katex.
RUN apt-get update \
    && apt-get install -y \
        ca-certificates curl git nodejs \
        texlive-latex-base texlive-latex-extra texlive-latex-recommended \
        texlive-fonts-recommended texlive-fonts-extra poppler-utils \
    && curl -fsSL --retry 5 --retry-all-errors -o /tmp/pandoc.deb \
        "https://github.com/jgm/pandoc/releases/download/${PANDOC_VERSION}/pandoc-${PANDOC_VERSION}-1-amd64.deb" \
    && dpkg -i /tmp/pandoc.deb \
    && rm -f /tmp/pandoc.deb \
    && rm -rf /var/lib/apt/lists/*

COPY templates/custom.latex templates/listings-setup.tex /usr/share/pandoc/data/templates/

RUN pandoc --version && pdflatex --version | head -n1 && pdftoppm -v 2>&1 | head -n1
