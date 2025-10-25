# Viduyim-Dosim - Simple confessions site

This small project provides a simple confessions form and an admin panel backed by Firebase Firestore.
Main features:
- Submit confessions (saved with `approved: false`).
- Admin page to approve/delete confessions and copy a formatted confession for sharing.
- Latest 3 *approved* confessions displayed on main page.

To deploy:
1. Create a Firebase project (you already did). Add a web app and copy the firebaseConfig into `script.js`.
2. In Firestore, create a `counters/confessions` doc if you wish; otherwise the code will create it on first write.
3. Change `ADMIN_PASSWORD` in `script.js` to a secure password.
4. Push the files to a GitHub repo and enable GitHub Pages (use `main` branch and root).
5. Optional: switch to Firebase Authentication for real admin users and tighten security rules.

Important safety note:
- The app stores confessions sent by users. To avoid harm and legal issues, do **not** allow sexual content involving minors or personally-identifying information. The site uses approval workflow (admin must approve) — keep active moderation.

