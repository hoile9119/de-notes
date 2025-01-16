# Containerization

### Colima
1. Installation (Apple Silicon)
    ```bash
    # install
    brew install colima
    ```
2. Quickstart
    ```bash
    # init
    colima init

    # start
    colima start

    # stop 
    colima stop

    # runtime - Docker
    brew install docker

    # run time - K8s
    brew install kubectl

    colima start --kubernetes
    ```

### [Portainer](https://docs.portainer.io/start/install-ce/server/docker/linux)
1. Installation
    ```bash
    # create vol
    docker volume create portainer_data

    # run
    docker run -d -p 8000:8000 -p 9443:9443 --name portainer --restart=always -v /var/run/docker.sock:/var/run/docker.sock -v portainer_data:/data portainer/portainer-ce:2.21.5

    # start
    https://localhost:9443
    ```