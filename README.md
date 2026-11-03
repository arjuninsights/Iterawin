# iterawin (Flask + Oracle)

```
app.py            Flask server: login, API, page protection
db.py             Oracle database layer (python-oracledb)
init_db.py        creates tables, starter content, owner account
schema_oracle.sql the same tables as plain SQL
seed_content.json starter technologies, projects, posts
public/           pages anyone can open (home, login) + css/js
protected/        pages only logged-in users can open (never served statically)
```

## Run on your computer
1. `python -m venv venv` then activate it, then `pip install -r requirements.txt`
2. Copy `.env.example` to `.env` and fill in the Oracle details and your owner email/password.
3. `python init_db.py` (run once)
4. `python app.py` and open http://127.0.0.1:5000

No Oracle yet? Add `DB=sqlite` to `.env` to try everything locally. Use Oracle for the real site.

## Deploy
GitHub Pages cannot run Python. Host the whole folder on a Python host (for example Render):
- Build command: `pip install -r requirements.txt`
- Start command: `gunicorn app:app`
- Environment variables: everything in `.env.example`, with `PRODUCTION=1` and a long random `SECRET_KEY`.
- Run `python init_db.py` once (Render shell, or from your computer with the same `.env`).

## Owner dashboard
Log in with the owner account and open Admin. You can enable, disable or delete students,
and add, edit or delete technologies, projects and posts.
Set `REQUIRE_APPROVAL=1` if you want to approve each new student before they can log in.
