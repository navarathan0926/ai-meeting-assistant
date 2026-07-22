# How to Create a Jira API Token

Follow these steps to generate the API token needed to connect your Jira
account to the app.

## Step 1: Create or access a Jira Cloud site

1. If you do not already have one, sign up for a free Jira Cloud site at
   atlassian.com.
2. Note your site URL. It will look like `yourcompany.atlassian.net`.
3. Make sure you have at least one project set up, and note its project
   key, shown in issue IDs like `PROJ-123`.

## Step 2: Get your Cloud ID

1. While logged into your Jira account, open this URL in your browser
   `https://yourcompany.atlassian.net/_edge/tenant_info`
   Replace `yourcompany` with your actual site name from your Jira URL.
   Example: if your Jira is https://myteam.atlassian.net, open
   https://myteam.atlassian.net/_edge/tenant_info
2. Copy the `cloudId` value from the response. You will need this later.

## Step 3: Create the API token

1. Go to `https://id.atlassian.com/manage-profile/security/api-tokens`
   Make sure the page URL starts with `id.atlassian.com`, not
   `admin.atlassian.com`. The admin site creates organization level
   tokens, which is not what you need here.
2. Click "Create API token with scopes."
3. Give the token a name, for example `meeting-assistant-integration`.
4. Set an expiration date, up to 365 days.
5. On the app selection step, choose Jira. If Jira is not listed as an
   option, you are likely on the wrong token creation screen. Go back to
   `id.atlassian.com` and try again.
6. Once Jira is selected, choose the following scopes.
   - `read:jira-work`
   - `write:jira-work`
   - `read:jira-user`
7. Click Create.
8. Copy the token immediately and store it somewhere safe. Atlassian will
   not show you the value again.

## Step 4: Test the token

Run the following command, replacing the placeholders with your own
values, to confirm the token works before using it in the app.

```bash
curl --request GET \
  --url 'https://api.atlassian.com/ex/jira/{cloudId}/rest/api/3/myself' \
  --user 'your-email@example.com:your-scoped-token' \
  --header 'Accept: application/json'
```

If this returns your account details instead of an error, the token is
working correctly.

## Values to provide to the app

Once the steps above are complete, collect the following five values.
These are what the app needs to connect to your Jira account.

| Value              | Where to find it                                  |
| ------------------ | ------------------------------------------------- |
| Jira site URL      | Step 1                                            |
| Jira account email | The email of the account used to create the token |
| API token          | Step 3                                            |
| Cloud ID           | Step 2                                            |
| Project key        | Step 1                                            |

## Common issues

- If you only see scopes ending in `:admin`, such as
  `read:accounts:admin` or `read:orgs:admin`, you are on the
  organization admin token page, not the personal Jira token page. Go to
  `id.atlassian.com/manage-profile/security/api-tokens` and start again.
- If test requests return 401 errors, confirm you are using the gateway
  URL format `https://api.atlassian.com/ex/jira/{cloudId}/...` rather
  than `https://yourcompany.atlassian.net/...`, since scoped tokens only
  work through the gateway URL.
- If a project is missing from the results, confirm the account used to
  create the token actually has access to that project.
