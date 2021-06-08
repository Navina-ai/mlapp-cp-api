docker build -t navina_mlapp_cp_api . || exit 1
docker tag navina_mlapp_cp_api:latest 153975004783.dkr.ecr.us-east-1.amazonaws.com/navina_mlapp_cp_api:latest || exit 1
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 153975004783.dkr.ecr.us-east-1.amazonaws.com || exit 1
docker push 153975004783.dkr.ecr.us-east-1.amazonaws.com/navina_mlapp_cp_api:latest || exit 1
aws ecs update-service --cluster mlapp --service MLappControlPanelService --force-new-deployment > ecs-update-service-out.json || exit 1
aws ecs wait services-stable --cluster mlapp --services MLappControlPanelService || exit 1


#docker rm -f $(docker ps -a -q)
#docker build -t navina_mlapp_cp_api . || exit 1
#docker run -it -p 3000:3000 navina_mlapp_cp_api
#docker logs -f🚫
