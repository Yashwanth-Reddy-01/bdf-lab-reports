# SportsShed – LG-5

Backend Development Fundamentals group assignment.

## Group members
- B. Navdeep
- Yashwanth
- Varun
- Charan
- Vikranth
- Varshith

## Project overview
SportsShed manages players, sports kits and equipment loans. It supports kit CRUD operations, searching kits by sport, a JOIN endpoint for loan details, and the LG-5 return-flow feature.

## Technology
- Node.js
- Express.js
- SQLite
- Postman

## Database tables
- `players`: `player_id`, `player_name`
- `kits`: `kit_id`, `kit_name`, `sport`
- `loans`: `loan_id`, `player_id`, `kit_id`, `issue_date`, `return_date`

The database file `sportsShed.db` is created automatically when the server starts.

## Setup
```bash
npm install
npm start
```

Server: `http://localhost:3000`

## API endpoints

### Players
- `GET /players/`
- `GET /players/:id/`
- `POST /players/`
- `GET /players/:id/history`

POST body:
```json
{"playerName":"Yashwanth"}
```

### Kits
- `GET /kits/`
- `GET /kits/?sport=Cricket`
- `GET /kits/:id/`
- `POST /kits/`
- `PUT /kits/:id/`
- `DELETE /kits/:id/`

POST/PUT body:
```json
{"kitName":"Cricket Bat","sport":"Cricket"}
```

### Loans
- `GET /loans/`
- `POST /loans/`
- `POST /loans/:id/return`

POST body:
```json
{"playerId":1,"kitId":1}
```

## LG-5 special requirement: Return flow
- First `POST /loans/:id/return` sets the return date and returns HTTP 200.
- A second return attempt returns HTTP 409 with `Already returned`.
- `GET /players/:id/history` lists that player's returned loans.

## Postman Screenshots
Full API execution output screenshots matching the Postman dark theme reference format are documented in [SCREENSHOTS.md](SCREENSHOTS.md) and stored in the [`screenshots/`](screenshots/) directory.

## Notes
This project is a starter implementation based on the LG-5 brief. Confirm exact request/response formats with your instructor's rubric and test all endpoints in Postman before submission.
