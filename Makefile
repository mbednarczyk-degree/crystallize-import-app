# === Makefile Helper ===

# Styles
YELLOW=\033[00;33m
RED=\033[00;31m
RESTORE=\033[0m

# Variables
PACKAGE_MANAGER := pnpm
DOCKER_COMPOSE = docker-compose
DEPENDENCIES := node pnpm git docker caddy
.DEFAULT_GOAL := list
CADDY_PID_FILE := caddy.dev.pid
CADDY = caddy

.PHONY: list
list:
	@echo "******************************"
	@echo "$(YELLOW)Available targets$(RESTORE):"
	@grep -E '^[a-zA-Z-]+:.*?## .*$$' Makefile | sort | awk 'BEGIN {FS = ":.*?## "}; {printf " $(YELLOW)%-15s$(RESTORE) > %s\n", $$1, $$2}'
	@echo "$(RED)==============================$(RESTORE)"

.PHONY: check-dependencies
check-dependencies:
	@powershell -Command " \
		$$( \
			foreach ($$dependency in '$(DEPENDENCIES)'.Split(' ')) { \
				if (-not (Get-Command $$dependency -ErrorAction SilentlyContinue)) { \
					Write-Host '$(RED)Error:$(RESTORE) $(YELLOW)'$$dependency'$(RESTORE) is not installed.'; \
					exit 1; \
				} \
			} \
		); \
		Write-Host 'All $(YELLOW)dependencies are installed.$(RESTORE)';"

.PHONY: install
install: check-dependencies update ## Install the Application and reset the database

.PHONY: update
update: check-dependencies ## Update the Repo
	@$(PACKAGE_MANAGER) install

.PHONY: start-services
start-services: stop-services ## Start Services
	@powershell -Command "New-Item -ItemType File -Force $(CADDY_PID_FILE) | Out-Null"
	@$(CADDY) start --pidfile $(CADDY_PID_FILE)

.PHONY: stop-services
stop-services: ## Stop Services
	@powershell -Command " \
		$$( \
			if (Test-Path $(CADDY_PID_FILE)) { \
				Stop-Process -Id (Get-Content $(CADDY_PID_FILE)) -Force -ErrorAction SilentlyContinue; \
				Remove-Item -Force $(CADDY_PID_FILE); \
			} \
		);"

.PHONY: serve
serve: ## Serve the application
	@$(PACKAGE_MANAGER) run dev --host
