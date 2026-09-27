# Teamspace frontend

React app for the Team Collaboration Platform API.

## Run locally

```sh
npm install
npm run dev
```

The app expects the API and Socket.IO server at `http://localhost:5000` by default. Set `VITE_API_URL` to the API base URL (including `/api`) or `VITE_SOCKET_URL` to the Socket.IO server URL when using a different host.

## Supported features

- Register, sign in, check the current user, and sign out.
- Create and switch between workspaces.
- Add registered workspace members by email and remove them by user ID.
- Create, open, and delete workspace channels. Owners can create and delete channels.
- Join a channel as a workspace member, load its messages, send messages in real time, show typing status, and edit or delete your own messages.

Workspace owners can add registered users by email. Workspace members can then open its channels.

## Checks

```sh
npm run lint
npm run build
```
