import os
import sys

os.environ['OAUTHLIB_INSECURE_TRANSPORT'] = '1'
os.environ['OAUTHLIB_RELAX_TOKEN_SCOPE'] = '1'

from google_auth_oauthlib.flow import InstalledAppFlow

SCOPES = ['https://www.googleapis.com/auth/drive.file', 'https://www.googleapis.com/auth/drive']

def main():
    print("============================================================", flush=True)
    print("GOOGLE DRIVE OAUTH AUTHENTICATION SETUP", flush=True)
    print("============================================================", flush=True)
    
    client_secret_file = 'client_secret.json'
    if not os.path.exists(client_secret_file):
        print(f"\n[!] Notice: '{client_secret_file}' not found.", flush=True)
        return

    flow = InstalledAppFlow.from_client_secrets_file(client_secret_file, SCOPES)
    
    # Run local server and automatically open the default browser window
    creds = flow.run_local_server(port=8080, open_browser=True)

    token_path = 'token.json'
    with open(token_path, 'w') as token_file:
        token_file.write(creds.to_json())
        token_file.flush()
        os.fsync(token_file.fileno())

    print(f"\n[+] SUCCESS! Token saved to '{token_path}'.", flush=True)
    print("    Your project will now upload directly using your 15 GB personal Google Drive storage!", flush=True)

if __name__ == '__main__':
    main()
