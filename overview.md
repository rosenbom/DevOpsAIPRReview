# AI-assisted PR Review

AI-assisted pull request review extension for Azure Repos.

The extension adds an `AI Review` hub to pull requests and connects to a backend service that can run analysis, report findings, and support local or Azure OpenAI-backed review flows.
## Sample result

<img width="1315" height="911" alt="image" src="https://github.com/user-attachments/assets/c73b3671-77c3-4763-aab5-85340fe318a8" />

## Backend
The easiest way to run the backend API is via Docker container:
```
docker run -p 8080:8080 \
  -e AzureDevOps__BaseUrl="https://ado-server.contoso.com/DefaultCollection" \
  -e AzureDevOps__Pat="<secret>" \
  -e Cors__AllowedOrigins__0="https://ado-server.contoso.com" \
  -e AzureOpenAI__Endpoint="https://YOUR-RESOURCE.openai.azure.com/" \
  -e AzureOpenAI__ApiKey="<secret>" \
  -e AzureOpenAI__Deployment="gpt-5.4" \
  dmitryrozenraukh/devops-ai-backend 
```  
The Backend API should be accessible over HTTP and the URL is configured from the extension UI. 

Docker Hub image:

- `dmitryrozenraukh/devops-ai-backend`

Link:

- https://hub.docker.com/r/dmitryrozenraukh/devops-ai-backend
