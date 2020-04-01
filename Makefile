OS_NAME := $(shell uname -s | tr A-Z a-z)

dev:
	@docker-compose up --build --remove-orphans

build:
ifeq ($(OS_NAME), linux)
	@docker-compose --file docker-compose.build.yml --file docker-compose.build.linux.yml up --build --remove-orphans
else
	@docker-compose --file docker-compose.build.yml up --build --remove-orphans
endif

clean:
	@docker-compose down --rmi all
	@docker-compose --file docker-compose.build.yml down --rmi all