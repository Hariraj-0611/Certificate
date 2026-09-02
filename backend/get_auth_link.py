import os
from google_auth_oauthlib.flow import InstalledAppFlow

SCOPES = ['https://www.googleapis.com/auth/drive.file', 'https://www.googleapis.com/auth/drive']

def main():
    client_secret_file = 'client_secret.json'
    if not os.path.exists(client_secret_file):
        print("MISSING_SECRET")
        return

    flow = InstalledAppFlow.from_client_secrets_file(
        client_secret_file,
        scopes=SCOPES,
        redirect_uri='http://localhost:8080/'
    )
    auth_url, _ = flow.authorization_url(prompt='consent', access_type='offline')
    print("AUTH_URL:", auth_url, flush=True)

if __name__ == '__main__':
    main()
