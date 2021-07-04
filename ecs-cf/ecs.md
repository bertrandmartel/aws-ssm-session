# ECS Command Exec

Quick ECS command exec demo without logging, from https://aws.amazon.com/fr/blogs/containers/new-using-amazon-ecs-exec-access-your-containers-fargate-ec2/

```bash
aws ecs register-task-definition \
    --cli-input-json file://ecs-exec-demo.json \
    --region eu-west-3

aws ecs run-task \
    --cluster ecs-exec-demo-cluster  \
    --task-definition ecs-exec-demo \
    --network-configuration awsvpcConfiguration="{subnets=[subnet-000fdffc2feabee4a, subnet-0c669351366b5f94e],assignPublicIp=ENABLED}" \
    --enable-execute-command \
    --launch-type FARGATE \
    --tags key=environment,value=production \
    --platform-version '1.4.0' \
    --region eu-west-3

aws ecs describe-tasks \
    --cluster ecs-exec-demo-cluster \
    --region eu-west-3 \
    --tasks acf2781d1bf34d44abc2930243c085d7

aws ecs execute-command  \
    --region eu-west-3 \
    --cluster ecs-exec-demo-cluster \
    --task acf2781d1bf34d44abc2930243c085d7 \
    --container nginx \
    --command "/bin/bash" \
    --interactive
```
