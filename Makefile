PYTHON ?= python3
VENV ?= $(HOME)/venvs/gatelate

.PHONY: setup install-python install-web dev build curate

setup: install-python install-web

install-python:
	$(PYTHON) -m venv $(VENV)
	. $(VENV)/bin/activate && pip install --upgrade pip && pip install -e .

install-web:
	pnpm install

dev:
	pnpm --dir apps/web dev

build:
	pnpm --dir apps/web build

curate:
	. $(VENV)/bin/activate && python scripts/etl/curate_v1_datasets.py
