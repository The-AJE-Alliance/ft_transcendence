DOCKER := 'docker --log-level ERROR compose'
APPS := "auth nginx pong"
RED := '\033[1;31m'
GREEN := '\033[1;32m'
YELLOW := '\033[1;33m'
BLUE := '\033[1;34m'
RESET := '\033[0m'

default: build up

ls:
	@echo "{{GREEN}}██████████████████████████ IMAGES ███████████████████████████{{RESET}}"
	@docker images
	@echo "{{YELLOW}}██████████████████████ ALL CONTAINERS ███████████████████████{{RESET}}"
	@docker ps -a

build: _env
	@echo "{{BLUE}}██████████████████████ Building Images ███████████████████████{{RESET}}"
	@{{DOCKER}} build

up: _env _before && _after
    #!/usr/bin/env bash
    docker --log-level ERROR compose up -d vault
    until docker logs vault |& grep -w 'Vault server started!' &> /dev/null; do
      true
    done
    docker --log-level ERROR compose up -d vault-init
    until docker logs vault-init |& grep -w 'Vault init done.' &> /dev/null; do
      true
    done
    . "./vault/scripts/launch.sh" "{{APPS}}"

logs:
	@echo "{{GREEN}}██████████████████████ Running Containers ██████████████████████{{RESET}}"
	@{{DOCKER}} logs

status:
	@echo "{{GREEN}}██████████████████████ The Running Containers ██████████████████████{{RESET}}"
	@docker ps

stop:
	@echo "{{RED}}████████████████████ Stopping Containers █████████████████████{{RESET}}"
	{{DOCKER}} stop

start:
	@echo "{{RED}}████████████████████ Starting Containers █████████████████████{{RESET}}"
	@{{DOCKER}} start

down:
	@echo "{{RED}}██████████████████ Removing All Containers ██████████████████{{RESET}}"
	@{{DOCKER}} down --remove-orphans

rm:
	@echo "{{RED}}██████████████████ Removing All Containers and Volumes ██████████████████{{RESET}}"
	@{{DOCKER}} down --remove-orphans -v

watch: build
    @echo "{{GREEN}}██████████████████████ Watching Containers... ██████████████████████{{RESET}}"
    @{{DOCKER}} up --watch

shell c="":
    {{DOCKER}} exec -it {{c}} sh

_env:
    #!/usr/bin/env bash
    set -euo pipefail
    if test ! -e .env; then
      echo -e "{{YELLOW}}Copying .env files...{{RESET}}\n"
      cp .env.example .env
    fi

_before:
    @echo "{{GREEN}}██████████████████████ Running Containers ██████████████████████{{RESET}}"

_after:
    @echo "{{RED}}╔════════════════════════════║NOTE:║════════════════════════╗{{RESET}}"
    @echo "{{RED}}║   {{BLUE}} You can see The Containers logs using {{YELLOW}}just logs        {{RED}}║{{RESET}}"
    @echo "{{RED}}╚═══════════════════════════════════════════════════════════╝{{RESET}}"

reload: down build up

reset: rm build up