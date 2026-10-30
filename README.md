# Grey Sloan Memorial Pager 0427

An unofficial, fictional hospital pager simulator designed as a small installable Progressive Web App (PWA).

## Features

- Responsive iPhone-friendly interface
- Simulated Routine, Urgent and Emergency pages
- Department selector and editable message
- Page acknowledgement and history
- Page history and on-call status saved in local browser storage
- Offline app shell using a service worker
- Installable web app manifest and app icons
- GitHub Actions deployment to GitHub Pages

## Deploy to GitHub Pages

1. Create a **public** GitHub repository named `grey-sloan-pager`.
2. Upload the contents of this folder to the repository root. Make sure `index.html` and `.github/workflows/deploy.yml` are at the root and in the indicated folder respectively.
3. Open **Settings → Pages** in the repository.
4. Under **Build and deployment → Source**, choose **GitHub Actions**.
5. Open the **Actions** tab and wait for **Deploy Grey Sloan Pager to GitHub Pages** to finish successfully.
6. Your site will be available at `https://YOUR-USERNAME.github.io/grey-sloan-pager/`.

Every push to `main` will deploy an updated version.

## Install on iPhone

1. Open the published URL in Safari (not an in-app browser).
2. Tap Share.
3. Choose **Add to Home Screen**.
4. Name it `GS Pager`, then tap Add.
5. Open it from the new Home Screen icon.

The first visit needs an internet connection. Once the service worker has cached the app, its main interface can load offline.

## Important limitations

- This is a fictional simulator. It does not connect to real hospital paging systems, emergency services or patient records.
- Pages are created inside the app; they are not delivered from another device or server.
- Page history is stored locally in the browser on that device. It does not sync between devices.
- The app does not currently send background push notifications. iOS web push requires a separately configured push service, a server component and user permission; a static GitHub Pages site alone cannot deliver remote pages.
- Do not enter real patient information or other sensitive data.
- The project uses an original fan-made visual identity and is not affiliated with Grey's Anatomy or any hospital.

## Local preview

Open `index.html` in a browser for a basic preview. Service-worker/offline features require serving the folder over localhost or HTTPS.
