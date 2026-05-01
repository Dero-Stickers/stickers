# Database e Supabase

## Stack Database

- **Sviluppo**: PostgreSQL su Replit (Drizzle ORM)
- **Futuro**: Supabase (PostgreSQL-compatible, drop-in replacement)

## Schema Principale

### users
```sql
id, nickname, pin_hash, cap, area, security_question, security_answer_hash,
recovery_code, is_premium, demo_started_at, demo_expires_at,
is_blocked, exchanges_completed, is_admin, created_at
```

### albums
```sql
id, title, description, cover_url, total_stickers, is_published, created_at
```

### stickers
```sql
id, album_id, number (int), name, description
```

### user_albums
```sql
id, user_id, album_id, added_at
```

### user_stickers
```sql
id, user_id, album_id, sticker_id, state (mancante|posseduta|doppia), updated_at
```

### chats
```sql
id, user1_id, user2_id, status (active|closed), created_at
```

### messages
```sql
id, chat_id, sender_id, text, created_at, is_read
```

### reports
```sql
id, reporter_id, reported_user_id, chat_id, reason, status, created_at
```

### admin_actions
```sql
id, admin_user_id, action_type, target_user_id, target_chat_id, notes, created_at
```

### app_settings
```sql
key (PK), value, description, updated_at
```

### cap_zones (futuro Supabase)
```sql
cap, area_name, lat_approx, lng_approx, region
```

## Transizione Mock → Supabase

1. Sviluppo completo con mock data
2. Creazione schema SQL per Supabase SQL Editor
3. Inserimento dati reali via Supabase
4. Connessione app a Supabase (solo variabile DATABASE_URL)
5. Rimozione mock data
6. Verifica finale con dati reali

## Calcolo Distanza CAP (Mock)

Nella fase mock, la distanza è simulata con un dataset di CAP italiani con coordinate approssimative.
La formula di distanza usa la distanza euclidea approssimativa (sufficiente per il mock).
In produzione: PostGIS o funzione Haversine su Supabase.
