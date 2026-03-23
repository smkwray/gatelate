PYTHON ?= python3
VENV ?= $(HOME)/venvs/gatelate

.PHONY: setup install-python install-web dev build curate curate-carrier analyses data-meta all-data test test-unit

setup: install-python install-web

install-python:
	$(PYTHON) -m venv $(VENV)
	. $(VENV)/bin/activate && pip install --upgrade pip && pip install -e ".[dev]"

install-web:
	pnpm install

dev:
	pnpm --dir apps/web dev

build:
	pnpm --dir apps/web build

curate:
	. $(VENV)/bin/activate && python scripts/etl/curate_v1_datasets.py

curate-carrier:
	. $(VENV)/bin/activate && python scripts/etl/curate_carrier_data.py

analyses:
	. $(VENV)/bin/activate && python scripts/build_analyses.py

data-meta:
	. $(VENV)/bin/activate && python scripts/emit_data_meta.py

all-data: curate curate-carrier analyses data-meta

test:
	. $(VENV)/bin/activate && pytest tests/ -v

test-unit:
	. $(VENV)/bin/activate && pytest tests/ -v -m "not integration"
